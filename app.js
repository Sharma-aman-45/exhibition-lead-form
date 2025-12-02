class ExhibitionLeadForm {
    constructor() {
        this.form = document.getElementById('leadForm');
        this.pendingLeads = JSON.parse(localStorage.getItem('pendingLeads')) || [];
        this.onlineStatus = navigator.onLine;
        this.GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyjmhsiB_10CoCqo__UT4pGaOH77EeWN453AV7h5UBkVlyKsXp0BBt1wuZ2XLB1G0zd/exec';
        
        this.init();
    }
    
    init() {
        this.updateStatusDisplay();
        this.attachEventListeners();
        this.updatePendingBadge();
        this.startNetworkMonitoring();
        this.trySyncPendingLeads();
    }
    
    updateStatusDisplay() {
        const onlineStatus = document.getElementById('online-status');
        const offlineStatus = document.getElementById('offline-status');
        const syncNowBtn = document.getElementById('syncNowBtn');
        
        if (this.onlineStatus) {
            onlineStatus.style.display = 'flex';
            offlineStatus.style.display = 'none';
            syncNowBtn.style.display = 'none';
        } else {
            onlineStatus.style.display = 'none';
            offlineStatus.style.display = 'flex';
            syncNowBtn.style.display = 'block';
        }
        
        document.getElementById('pending-count').textContent = 
            `Pending sync: ${this.pendingLeads.length}`;
        document.getElementById('pendingBadge').textContent = this.pendingLeads.length;
    }
    
    attachEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Network status buttons
        document.getElementById('viewPendingBtn').addEventListener('click', 
            () => this.showPendingModal());
        document.getElementById('syncNowBtn').addEventListener('click', 
            () => this.trySyncPendingLeads());
        
        // Modal buttons
        document.querySelector('.close-modal').addEventListener('click', 
            () => this.closeModal());
        document.getElementById('clearAllBtn').addEventListener('click', 
            () => this.clearPendingLeads());
        document.getElementById('retrySyncBtn').addEventListener('click', 
            () => this.trySyncPendingLeads());
        
        // Close modal on outside click
        document.getElementById('pendingModal').addEventListener('click', (e) => {
            if (e.target.id === 'pendingModal') this.closeModal();
        });
        
        // Network status changes
        window.addEventListener('online', () => {
            this.onlineStatus = true;
            this.updateStatusDisplay();
            this.trySyncPendingLeads();
        });
        
        window.addEventListener('offline', () => {
            this.onlineStatus = false;
            this.updateStatusDisplay();
        });
    }
    
    startNetworkMonitoring() {
        // Check network status every 30 seconds
        setInterval(() => {
            if (navigator.onLine !== this.onlineStatus) {
                this.onlineStatus = navigator.onLine;
                this.updateStatusDisplay();
                if (this.onlineStatus) {
                    this.trySyncPendingLeads();
                }
            }
        }, 30000);
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const leadData = {
            timestamp: new Date().toISOString(),
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
            consent: formData.get('consent') ? 'Yes' : 'No'
        };
        
        // Validate required fields
        if (!leadData.fullName || !leadData.email) {
            alert('Please fill in required fields (Name and Email)');
            return;
        }
        
        if (this.onlineStatus) {
            await this.submitToGoogleSheets(leadData);
        } else {
            this.saveLocally(leadData);
        }
    }
    
    async submitToGoogleSheets(leadData) {
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"></div> Submitting...';
            submitBtn.disabled = true;
            
            // Show syncing status
            this.showSyncStatus();
            
            // Prepare data for Google Sheets
            const sheetData = leadData; // Send data directly, no wrapper
            
  const response = await fetch(this.GOOGLE_SHEET_URL, {
  method: 'POST',
  mode: 'no-cors',
  headers: {
    'Content-Type': 'text/plain',
  },
  body: JSON.stringify(leadData)  // CORRECT: 'leadData' is the parameter
});
            
            if (response.ok) {
                this.showSuccess('Lead submitted successfully to Google Sheets!');
                this.form.reset();
            } else {
                throw new Error('Failed to submit to Google Sheets');
            }
        } catch (error) {
            console.error('Online submission failed:', error);
            this.saveLocally(leadData);
            this.showWarning('Internet issue. Lead saved locally for later sync.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.hideSyncStatus();
        }
    }
    
    saveLocally(leadData) {
        // Add unique ID and status
        leadData.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        leadData.status = 'pending';
        leadData.syncAttempts = 0;
        
        this.pendingLeads.unshift(leadData);
        localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
        
        this.updatePendingBadge();
        this.updateStatusDisplay();
        this.form.reset();
        
        this.showSuccess('✓ Lead saved locally! Will sync when back online.');
        
        // Visual feedback
        this.animateSubmitButton();
    }
    
  async trySyncPendingLeads() {
  if (!this.onlineStatus || this.pendingLeads.length === 0) return;
  
  this.showSyncStatus();
  
  const failedLeads = [];
  
  for (const lead of [...this.pendingLeads]) {  // Note: 'lead' is defined here
    try {
      lead.syncAttempts = (lead.syncAttempts || 0) + 1;
      
      // FIX: Use proper variable name
      const response = await fetch(this.GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',  // Important for localhost
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(lead)  // CORRECT: 'lead' is defined in for loop
      });
      
      // With mode: 'no-cors', we can't read response but request is sent
      // Assume success and remove from pending
      this.pendingLeads = this.pendingLeads.filter(l => l.id !== lead.id);
      console.log(`✅ Sent lead: ${lead.email}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Sync error for: ${lead.email}`, error);
      if (lead.syncAttempts < 3) {
        failedLeads.push(lead);
      } else {
        console.warn(`Max sync attempts reached for: ${lead.email}`);
        failedLeads.push({...lead, status: 'failed'});
      }
    }
  }
  
  // Update storage with remaining/failed leads
  this.pendingLeads = failedLeads;
  localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
  
  this.updatePendingBadge();
  this.updateStatusDisplay();
  this.hideSyncStatus();
  
  if (failedLeads.length < this.pendingLeads.length) {
    const syncedCount = this.pendingLeads.length - failedLeads.length;
    this.showSuccess(`✅ Synced ${syncedCount} lead(s)!`);
  }
  
  // Refresh modal if open
  if (document.getElementById('pendingModal').style.display === 'block') {
    this.showPendingModal();
  }
}
    
    showPendingModal() {
        const modal = document.getElementById('pendingModal');
        const listContainer = document.getElementById('pendingLeadsList');
        
        if (this.pendingLeads.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">No pending leads. All data is synced!</p>';
        } else {
            listContainer.innerHTML = this.pendingLeads.map(lead => `
                <div class="pending-lead">
                    <h4>${lead.fullName} ${lead.company ? `- ${lead.company}` : ''}</h4>
                    <p>📧 ${lead.email}</p>
                    <p>📅 ${new Date(lead.timestamp).toLocaleString()}</p>
                    <p>🔄 Sync attempts: ${lead.syncAttempts || 0}</p>
                    ${lead.phone ? `<p>📱 ${lead.phone}</p>` : ''}
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
    }
    
    closeModal() {
        document.getElementById('pendingModal').style.display = 'none';
    }
    
    clearPendingLeads() {
        if (confirm('Are you sure you want to clear all pending leads? This cannot be undone.')) {
            this.pendingLeads = [];
            localStorage.removeItem('pendingLeads');
            this.updatePendingBadge();
            this.updateStatusDisplay();
            this.closeModal();
            this.showSuccess('All pending leads cleared.');
        }
    }
    
    updatePendingBadge() {
        document.getElementById('pendingBadge').textContent = this.pendingLeads.length;
    }
    
    showSyncStatus() {
        document.getElementById('sync-status').style.display = 'flex';
    }
    
    hideSyncStatus() {
        document.getElementById('sync-status').style.display = 'none';
    }
    
    showSuccess(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    showWarning(message) {
        const toast = document.createElement('div');
        toast.className = 'toast warning';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffc107;
            color: #000;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    animateSubmitButton() {
        const btn = document.getElementById('submitBtn');
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);
    }
    
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