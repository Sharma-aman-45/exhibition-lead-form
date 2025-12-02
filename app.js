class ExhibitionLeadForm {
  constructor() {
    this.form = document.getElementById('leadForm');
    this.pendingLeads = JSON.parse(localStorage.getItem('pendingLeads')) || [];
    this.onlineStatus = navigator.onLine;
    
    // SHEET.BEST API ENDPOINT - REPLACE WITH YOURS
    this.API_URL = 'https://api.sheetbest.com/sheets/052cdb41-25db-4b58-9e96-01275db6bb9d';
    
    this.init();
  }
  
  init() {
    this.updateStatusDisplay();
    this.attachEventListeners();
    this.updatePendingBadge();
    this.startNetworkMonitoring();
    
    // Auto-sync if online and pending leads exist
    if (this.onlineStatus && this.pendingLeads.length > 0) {
      setTimeout(() => this.trySyncPendingLeads(), 3000);
    }
  }
  
  updateStatusDisplay() {
    const onlineStatus = document.getElementById('online-status');
    const offlineStatus = document.getElementById('offline-status');
    
    if (this.onlineStatus) {
      onlineStatus.style.display = 'flex';
      offlineStatus.style.display = 'none';
    } else {
      onlineStatus.style.display = 'none';
      offlineStatus.style.display = 'flex';
    }
    
    document.getElementById('pending-count').textContent = 
      `Pending sync: ${this.pendingLeads.length}`;
    document.getElementById('pendingBadge').textContent = this.pendingLeads.length;
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.form);
    const leadData = {
      timestamp: new Date().toLocaleString(),
      deviceId: this.getDeviceId(),
      fullName: formData.get('fullName'),
      company: formData.get('company'),
      jobTitle: formData.get('jobTitle'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      country: formData.get('country'),
      productInterest: Array.from(formData.getAll('productInterest')).join(', '),
      leadSource: formData.get('leadSource'),
      notes: formData.get('notes'),
      followUp: formData.get('followUp'),
      consent: formData.get('consent') ? 'Yes' : 'No',
      status: this.onlineStatus ? 'synced' : 'pending'
    };
    
    // Validate
    if (!leadData.fullName || !leadData.email) {
      alert('Please fill in required fields (Name and Email)');
      return;
    }
    
    if (this.onlineStatus) {
      await this.submitToSheetBest(leadData);
    } else {
      this.saveLocally(leadData);
    }
  }
  
  async submitToSheetBest(leadData) {
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
      submitBtn.innerHTML = '<div class="loading"></div> Submitting...';
      submitBtn.disabled = true;
      
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([leadData]) // Sheet.best expects array
      });
      
      if (response.ok) {
        this.showSuccess('✅ Lead saved to Google Sheets!');
        this.form.reset();
        console.log('Data saved successfully:', leadData);
      } else {
        throw new Error('Failed to save');
      }
      
    } catch (error) {
      console.error('Online submission failed:', error);
      this.saveLocally(leadData);
      this.showWarning('⚠️ Internet issue. Lead saved locally for later sync.');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
  
  saveLocally(leadData) {
    leadData.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    leadData.status = 'pending';
    leadData.syncAttempts = 0;
    
    this.pendingLeads.unshift(leadData);
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    
    this.updatePendingBadge();
    this.updateStatusDisplay();
    this.form.reset();
    
    this.showSuccess('💾 Lead saved locally! Will sync when back online.');
  }
  
  async trySyncPendingLeads() {
    if (!this.onlineStatus || this.pendingLeads.length === 0) return;
    
    this.showSyncStatus();
    const failedLeads = [];
    
    for (const lead of [...this.pendingLeads]) {
      try {
        lead.syncAttempts = (lead.syncAttempts || 0) + 1;
        
        // Remove id from data before sending
        const dataToSend = {...lead};
        delete dataToSend.id;
        delete dataToSend.syncAttempts;
        delete dataToSend.status;
        
        const response = await fetch(this.API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([dataToSend])
        });
        
        if (response.ok) {
          // Remove from pending
          this.pendingLeads = this.pendingLeads.filter(l => l.id !== lead.id);
          console.log(`✅ Synced lead: ${lead.email}`);
        } else {
          throw new Error('Failed to sync');
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Sync error for: ${lead.email}`, error);
        if (lead.syncAttempts < 3) {
          failedLeads.push(lead);
        }
      }
    }
    
    // Update storage
    this.pendingLeads = failedLeads;
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    
    this.updatePendingBadge();
    this.updateStatusDisplay();
    this.hideSyncStatus();
    
    if (failedLeads.length < this.pendingLeads.length) {
      const syncedCount = this.pendingLeads.length - failedLeads.length;
      this.showSuccess(`✅ Synced ${syncedCount} lead(s) to Google Sheets!`);
    }
    
    // Refresh modal if open
    if (document.getElementById('pendingModal').style.display === 'block') {
      this.showPendingModal();
    }
  }
  
  // Keep all other methods (attachEventListeners, showSuccess, etc.) the same
  // Just copy them from your existing code
  
  getDeviceId() {
    let deviceId = localStorage.getItem('exhibitionDeviceId');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('exhibitionDeviceId', deviceId);
    }
    return deviceId;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExhibitionLeadForm();
    
    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100px); opacity: 0; }
        }
        .toast {
            font-weight: 600;
        }
        .empty-state {
            text-align: center;
            color: #666;
            padding: 40px 20px;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
});
async function jsonpRequest(url, data) {
  return new Promise((resolve, reject) => {
    // Create callback name
    const callbackName = 'jsonp_callback_' + Date.now();
    
    // Create script element
    const script = document.createElement('script');
    
    // Build URL with callback
    const params = new URLSearchParams();
    params.append('callback', callbackName);
    params.append('data', JSON.stringify(data));
    
    script.src = url + '?' + params.toString();
    
    // Define callback function
    window[callbackName] = function(response) {
      document.body.removeChild(script);
      delete window[callbackName];
      resolve(response);
    };
    
    // Add to page
    document.body.appendChild(script);
    
    // Timeout
    setTimeout(() => {
      document.body.removeChild(script);
      delete window[callbackName];
      reject(new Error('Timeout'));
    }, 10000);
  });
}