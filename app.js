// ============================================
// EXHIBITION LEAD FORM - GUARANTEED WORKING
// ============================================

const EXHIBITION_FORM = {
  // ========== CONFIGURATION ==========
  config: {
    // 🔧 YAHAN APNA SHEET.BEST URL DALO
    API_URL: 'https://app.sheetbest.com/admin/connection-detail/052cdb41-25db-4b58-9e96-01275db6bb9d',
    
    // Google Sheet headers (EXACT match)
    FIELDS: [
      'timestamp',
      'fullName', 
      'email',
      'phone',
      'company',
      'jobTitle',
      'country',
      'productInterest',
      'leadSource',
      'notes',
      'followUp',
      'consent',
      'deviceId',
      'status'
    ]
  },
  
  // ========== STATE ==========
  state: {
    pendingLeads: [],
    isOnline: navigator.onLine
  },
  
  // ========== INITIALIZATION ==========
  init() {
    console.log('🎪 Exhibition Form Initializing...');
    console.log('🔗 API:', this.config.API_URL);
    console.log('🌐 Online:', this.state.isOnline);
    
    // Load pending leads
    this.loadPendingLeads();
    
    // Setup events
    this.setupEvents();
    
    // Update UI
    this.updateUI();
    
    // Auto-sync if online
    if (this.state.isOnline && this.state.pendingLeads.length > 0) {
      setTimeout(() => this.syncAllPending(), 3000);
    }
    
    console.log('✅ Form ready!');
  },
  
  // ========== CORE FUNCTIONS ==========
  
  // Load pending leads from localStorage
  loadPendingLeads() {
    try {
      const saved = localStorage.getItem('exhibitionPendingLeads');
      this.state.pendingLeads = saved ? JSON.parse(saved) : [];
      console.log(`📦 Loaded ${this.state.pendingLeads.length} pending leads`);
    } catch (e) {
      console.error('Error loading pending leads:', e);
      this.state.pendingLeads = [];
    }
  },
  
  // Save pending leads to localStorage
  savePendingLeads() {
    try {
      localStorage.setItem('exhibitionPendingLeads', 
        JSON.stringify(this.state.pendingLeads));
    } catch (e) {
      console.error('Error saving pending leads:', e);
    }
  },
  
  // Setup all event listeners
  setupEvents() {
    // Form submission
    const form = document.getElementById('leadForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
    
    // Network events
    window.addEventListener('online', () => {
      console.log('🟢 Internet connected');
      this.state.isOnline = true;
      this.updateUI();
      this.syncAllPending();
    });
    
    window.addEventListener('offline', () => {
      console.log('🔴 Internet disconnected');
      this.state.isOnline = false;
      this.updateUI();
    });
    
    // Sync button
    const syncBtn = document.getElementById('syncNowBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncAllPending());
    }
  },
  
  // Update UI based on state
  updateUI() {
    // Update status display
    const onlineEl = document.getElementById('online-status');
    const offlineEl = document.getElementById('offline-status');
    
    if (this.state.isOnline) {
      if (onlineEl) onlineEl.style.display = 'flex';
      if (offlineEl) offlineEl.style.display = 'none';
    } else {
      if (onlineEl) onlineEl.style.display = 'none';
      if (offlineEl) offlineEl.style.display = 'flex';
    }
    
    // Update pending count
    const countEl = document.getElementById('pendingBadge');
    if (countEl) {
      countEl.textContent = this.state.pendingLeads.length;
    }
    
    // Update sync button visibility
    const syncBtn = document.getElementById('syncNowBtn');
    if (syncBtn) {
      syncBtn.style.display = this.state.isOnline ? 'inline-block' : 'none';
    }
  },
  
  // ========== FORM HANDLING ==========
  
  // Handle form submission
  async handleSubmit() {
    console.log('📝 Form submitted');
    
    // Collect form data
    const formData = this.collectFormData();
    
    // Validate
    if (!this.validateForm(formData)) {
      return;
    }
    
    // Create lead object
    const lead = this.createLeadObject(formData);
    
    console.log('📋 Lead created:', lead);
    
    // Submit based on network
    if (this.state.isOnline) {
      await this.submitOnline(lead);
    } else {
      this.saveOffline(lead);
    }
  },
  
  // Collect all form data
  collectFormData() {
    return {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim() || '',
      company: document.getElementById('company').value.trim() || '',
      jobTitle: document.getElementById('jobTitle').value.trim() || '',
      country: document.getElementById('country').value.trim() || '',
      productInterest: this.getSelectedValues('productInterest'),
      leadSource: document.getElementById('leadSource').value.trim() || '',
      notes: document.getElementById('notes').value.trim() || '',
      followUp: this.getRadioValue('followUp'),
      consent: document.querySelector('input[name="consent"]')?.checked || false
    };
  },
  
  // Get selected values from multi-select
  getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return '';
    
    const selected = [];
    for (let option of select.options) {
      if (option.selected) selected.push(option.value);
    }
    return selected.join(', ');
  },
  
  // Get radio button value
  getRadioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : '';
  },
  
  // Validate form
  validateForm(data) {
    if (!data.fullName) {
      alert('Please enter full name');
      document.getElementById('fullName').focus();
      return false;
    }
    
    if (!data.email) {
      alert('Please enter email address');
      document.getElementById('email').focus();
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      alert('Please enter a valid email address');
      document.getElementById('email').focus();
      return false;
    }
    
    return true;
  },
  
  // Create lead object with all fields
  createLeadObject(formData) {
    return {
      timestamp: new Date().toLocaleString(),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      jobTitle: formData.jobTitle,
      country: formData.country,
      productInterest: formData.productInterest,
      leadSource: formData.leadSource,
      notes: formData.notes,
      followUp: formData.followUp,
      consent: formData.consent ? 'Yes' : 'No',
      deviceId: this.getDeviceId(),
      status: this.state.isOnline ? 'synced' : 'pending'
    };
  },
  
  // Get or create device ID
  getDeviceId() {
    let deviceId = localStorage.getItem('exhibitionDeviceId');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('exhibitionDeviceId', deviceId);
    }
    return deviceId;
  },
  
  // ========== ONLINE SUBMISSION ==========
  
  // Submit lead online
  async submitOnline(lead) {
    console.log('🌐 Submitting online...');
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading
      submitBtn.innerHTML = '⏳ Saving...';
      submitBtn.disabled = true;
      
      // Prepare data - MUST be array
      const payload = [lead];
      
      console.log('📤 Sending payload:', payload);
      console.log('🔗 To URL:', this.config.API_URL);
      
      // Send to Sheet.best
      const response = await fetch(this.config.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📨 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success:', result);
        
        // Show success
        this.showMessage('✅ Lead saved to Google Sheets!', 'success');
        
        // Reset form
        document.getElementById('leadForm').reset();
        
      } else {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error('❌ Submission failed:', error);
      
      // Fallback to offline save
      this.saveOffline(lead);
      this.showMessage('⚠️ Saved locally (online failed)', 'warning');
      
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },
  
  // ========== OFFLINE SAVE ==========
  
  // Save lead offline
  saveOffline(lead) {
    console.log('💾 Saving offline...');
    
    // Add metadata
    lead.id = Date.now(); // Unique ID
    lead.syncAttempts = 0;
    
    // Add to pending
    this.state.pendingLeads.unshift(lead);
    this.savePendingLeads();
    
    // Update UI
    this.updateUI();
    
    // Reset form
    document.getElementById('leadForm').reset();
    
    console.log('💾 Saved. Total pending:', this.state.pendingLeads.length);
    this.showMessage(`💾 Saved locally! (${this.state.pendingLeads.length} pending)`, 'info');
  },
  
  // ========== SYNC PENDING LEADS ==========
  
  // Sync all pending leads
  async syncAllPending() {
    if (!this.state.isOnline) {
      console.log('⏸️ Sync skipped - offline');
      this.showMessage('⚠️ Cannot sync - offline', 'warning');
      return;
    }
    
    if (this.state.pendingLeads.length === 0) {
      console.log('⏸️ Sync skipped - no pending leads');
      return;
    }
    
    console.log(`🔄 Syncing ${this.state.pendingLeads.length} pending leads...`);
    this.showMessage(`🔄 Syncing ${this.state.pendingLeads.length} leads...`, 'info');
    
    const failedLeads = [];
    
    // Process each lead
    for (const lead of [...this.state.pendingLeads]) {
      try {
        console.log(`📤 Syncing: ${lead.email}`);
        
        // Prepare data (remove internal fields)
        const dataToSend = {...lead};
        delete dataToSend.id;
        delete dataToSend.syncAttempts;
        delete dataToSend.status;
        
        // Send to Sheet.best
        const response = await fetch(this.config.API_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify([dataToSend])
        });
        
        if (response.ok) {
          console.log(`✅ Synced: ${lead.email}`);
          
          // Remove from pending
          this.state.pendingLeads = this.state.pendingLeads.filter(l => l.id !== lead.id);
          
        } else {
          console.log(`❌ Failed: ${lead.email} - HTTP ${response.status}`);
          lead.syncAttempts = (lead.syncAttempts || 0) + 1;
          failedLeads.push(lead);
        }
        
        // Wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error syncing ${lead.email}:`, error);
        lead.syncAttempts = (lead.syncAttempts || 0) + 1;
        failedLeads.push(lead);
      }
    }
    
    // Save remaining leads
    this.state.pendingLeads = failedLeads;
    this.savePendingLeads();
    this.updateUI();
    
    console.log(`🔄 Sync complete. Failed: ${failedLeads.length}`);
    
    if (failedLeads.length === 0) {
      this.showMessage('✅ All leads synced successfully!', 'success');
    } else {
      this.showMessage(`⚠️ ${failedLeads.length} leads failed to sync`, 'warning');
    }
  },
  
  // ========== UTILITIES ==========
  
  // Show message to user
  showMessage(text, type = 'info') {
    // Remove existing messages
    const existing = document.querySelectorAll('.exhibition-message');
    existing.forEach(el => el.remove());
    
    // Create message element
    const message = document.createElement('div');
    message.className = 'exhibition-message';
    message.textContent = text;
    
    // Style based on type
    const styles = {
      success: 'background: #28a745; color: white;',
      warning: 'background: #ffc107; color: black;',
      error: 'background: #dc3545; color: white;',
      info: 'background: #17a2b8; color: white;'
    };
    
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 9999;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ${styles[type] || styles.info}
    `;
    
    document.body.appendChild(message);
    
    // Remove after 3 seconds
    setTimeout(() => {
      message.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }
};

// ============================================
// START THE APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
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
    
    .exhibition-message {
      font-family: Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);
  
  // Initialize the form
  EXHIBITION_FORM.init();
  
  // Add debug info to page
  const debugInfo = document.createElement('div');
  debugInfo.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 9998;
    max-width: 300px;
  `;
  debugInfo.innerHTML = `
    <strong>Debug Info:</strong><br>
    API: ${EXHIBITION_FORM.config.API_URL ? '✅ Set' : '❌ Not set'}<br>
    Online: <span id="debug-online">${navigator.onLine ? 'Yes' : 'No'}</span><br>
    Pending: <span id="debug-pending">0</span>
  `;
  document.body.appendChild(debugInfo);
  
  // Update debug info
  setInterval(() => {
    document.getElementById('debug-online').textContent = 
      EXHIBITION_FORM.state.isOnline ? 'Yes' : 'No';
    document.getElementById('debug-pending').textContent = 
      EXHIBITION_FORM.state.pendingLeads.length;
  }, 1000);
});