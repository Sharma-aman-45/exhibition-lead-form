class ExhibitionLeadForm {
  constructor() {
    this.form = document.getElementById('leadForm');
    this.pendingLeads = JSON.parse(localStorage.getItem('pendingLeads')) || [];
    this.onlineStatus = navigator.onLine;
    
    // ✅ YAHAN APNA SAHI URL DALO
    this.API_URL = 'https://api.sheetbest.com/sheets/052cdb41-25db-4b58-9e96-01275db6bb9d';
    
    this.init();
  }
  
  init() {
    console.log('📱 Form initialized');
    console.log('Online:', this.onlineStatus);
    console.log('API:', this.API_URL);
    console.log('Pending:', this.pendingLeads.length);
    
    this.attachEvents();
    this.updateDisplay();
    
    // Auto-sync if online
    if (this.onlineStatus && this.pendingLeads.length > 0) {
      setTimeout(() => this.syncPending(), 2000);
    }
  }
  
  attachEvents() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.onSubmit(e));
    
    // Network status
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      this.updateDisplay();
      this.syncPending();
    });
    
    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      this.updateDisplay();
    });
    
    // Sync button
    const syncBtn = document.getElementById('syncNowBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncPending());
    }
  }
  
  updateDisplay() {
    const onlineEl = document.getElementById('online-status');
    const offlineEl = document.getElementById('offline-status');
    
    if (this.onlineStatus) {
      onlineEl.style.display = 'flex';
      offlineEl.style.display = 'none';
    } else {
      onlineEl.style.display = 'none';
      offlineEl.style.display = 'flex';
    }
    
    // Update counts
    document.getElementById('pending-count').textContent = 
      `Pending sync: ${this.pendingLeads.length}`;
    
    const badge = document.getElementById('pendingBadge');
    if (badge) badge.textContent = this.pendingLeads.length;
  }
  
  onSubmit(e) {
    e.preventDefault();
    console.log('🔘 Form submit button clicked');
    
    // Get ALL form values
    const lead = {
      timestamp: new Date().toLocaleString(),
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value || '',
      company: document.getElementById('company').value || '',
      jobTitle: document.getElementById('jobTitle').value || '',
      country: document.getElementById('country').value || '',
      productInterest: this.getSelectedValues('productInterest'),
      leadSource: document.getElementById('leadSource').value || '',
      notes: document.getElementById('notes').value || '',
      followUp: document.querySelector('input[name="followUp"]:checked')?.value || '',
      consent: document.querySelector('input[name="consent"]')?.checked ? 'Yes' : 'No',
      deviceId: this.getDeviceId(),
      status: 'pending'
    };
    
    console.log('📄 Form data collected:', lead);
    
    // Validation
    if (!lead.fullName.trim() || !lead.email.trim()) {
      alert('Please enter Name and Email');
      return;
    }
    
    // Submit based on network
    if (this.onlineStatus) {
      this.saveOnline(lead);
    } else {
      this.saveOffline(lead);
    }
  }
  
  getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    const selected = [];
    for (let option of select.options) {
      if (option.selected) selected.push(option.value);
    }
    return selected.join(', ');
  }
  
  getDeviceId() {
    let deviceId = localStorage.getItem('exhibitionDeviceId');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('exhibitionDeviceId', deviceId);
    }
    return deviceId;
  }
  
  async saveOnline(lead) {
    console.log('🌐 Attempting ONLINE save...');
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading
      submitBtn.innerHTML = '⏳ Saving...';
      submitBtn.disabled = true;
      
      // ✅ CRITICAL: Send as ARRAY
      const payload = [lead];
      
      console.log('📤 Sending payload:', payload);
      console.log('📤 API URL:', this.API_URL);
      
      // Send request
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📨 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success response:', result);
        
        // Success
        this.showMessage('✅ Lead saved to Google Sheets!', 'success');
        this.form.reset();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Online save failed:', error);
      
      // Fallback to offline
      this.saveOffline(lead);
      this.showMessage('⚠️ Saved locally (online failed)', 'warning');
      
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
  
  saveOffline(lead) {
    console.log('💾 Saving OFFLINE...');
    
    // Add unique ID
    lead.id = Date.now();
    lead.syncAttempts = 0;
    
    // Save to pending
    this.pendingLeads.push(lead);
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    
    // Update UI
    this.updateDisplay();
    this.form.reset();
    
    console.log('💾 Saved. Total pending:', this.pendingLeads.length);
    this.showMessage(`💾 Saved locally! (${this.pendingLeads.length} pending)`, 'info');
  }
  
  async syncPending() {
    if (!this.onlineStatus || this.pendingLeads.length === 0) {
      console.log('⏸️ Sync skipped - offline or no pending');
      return;
    }
    
    console.log(`🔄 Syncing ${this.pendingLeads.length} pending leads...`);
    
    const failed = [];
    
    for (const lead of [...this.pendingLeads]) {
      try {
        console.log(`📤 Syncing: ${lead.email}`);
        
        // Prepare data (remove internal fields)
        const dataToSend = {...lead};
        delete dataToSend.id;
        delete dataToSend.syncAttempts;
        
        // ✅ Send as ARRAY
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify([dataToSend])
        });
        
        if (response.ok) {
          console.log(`✅ Synced: ${lead.email}`);
          
          // Remove from pending
          this.pendingLeads = this.pendingLeads.filter(l => l.id !== lead.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Sync failed: ${lead.email}`, error);
        failed.push(lead);
      }
    }
    
    // Update storage
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    this.updateDisplay();
    
    console.log(`🔄 Sync complete. Failed: ${failed.length}`);
    
    if (failed.length === 0 && this.pendingLeads.length === 0) {
      this.showMessage('✅ All leads synced!', 'success');
    }
  }
  
  showMessage(text, type = 'info') {
    // Create toast
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') toast.style.background = '#28a745';
    else if (type === 'warning') toast.style.background = '#ffc107';
    else toast.style.background = '#007bff';
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Exhibition Lead Form Starting...');
  new ExhibitionLeadForm();
});