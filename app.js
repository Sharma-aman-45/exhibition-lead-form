class ExhibitionLeadForm {
  constructor() {
    console.log('=== APP STARTING ===');
    
    this.form = document.getElementById('leadForm');
    this.pendingLeads = JSON.parse(localStorage.getItem('pendingLeads')) || [];
    this.onlineStatus = navigator.onLine;
    
    // ✅ YAHAN APNA SAHI URL DALO
    this.API_URL = 'https://api.sheetbest.com/sheets/052cdb41-25db-4b58-9e96-01275db6bb9d';
    
    console.log('API URL:', this.API_URL);
    console.log('Online:', this.onlineStatus);
    console.log('Pending:', this.pendingLeads.length);
    
    this.init();
  }
  
  init() {
    // Update UI
    this.updateUI();
    
    // Event listeners
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Network events
    window.addEventListener('online', () => {
      console.log('🟢 Internet connected');
      this.onlineStatus = true;
      this.updateUI();
      this.trySyncPendingLeads();
    });
    
    window.addEventListener('offline', () => {
      console.log('🔴 Internet disconnected');
      this.onlineStatus = false;
      this.updateUI();
    });
    
    // Auto-sync if online
    if (this.onlineStatus && this.pendingLeads.length > 0) {
      setTimeout(() => this.trySyncPendingLeads(), 2000);
    }
  }
  
  updateUI() {
    const onlineEl = document.getElementById('online-status');
    const offlineEl = document.getElementById('offline-status');
    
    if (this.onlineStatus) {
      onlineEl.style.display = 'flex';
      offlineEl.style.display = 'none';
    } else {
      onlineEl.style.display = 'none';
      offlineEl.style.display = 'flex';
    }
    
    // Update pending count
    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.textContent = this.pendingLeads.length;
    }
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    console.log('📝 Form submitted');
    
    // Get form data
    const formData = new FormData(this.form);
    const lead = {
      timestamp: new Date().toLocaleString(),
      fullName: formData.get('fullName') || '',
      email: formData.get('email') || '',
      phone: formData.get('phone') || '',
      company: formData.get('company') || '',
      jobTitle: formData.get('jobTitle') || '',
      country: formData.get('country') || '',
      productInterest: Array.from(formData.getAll('productInterest')).join(', '),
      leadSource: formData.get('leadSource') || '',
      notes: formData.get('notes') || '',
      followUp: formData.get('followUp') || '',
      consent: formData.get('consent') ? 'Yes' : 'No',
      deviceId: localStorage.getItem('deviceId') || 'unknown-' + Date.now(),
      status: 'pending'
    };
    
    console.log('📋 Lead prepared:', lead);
    
    // Validate
    if (!lead.fullName || !lead.email) {
      alert('Please enter Name and Email');
      return;
    }
    
    if (this.onlineStatus) {
      console.log('🌐 Attempting online submission...');
      await this.submitOnline(lead);
    } else {
      console.log('💾 Saving offline...');
      this.saveOffline(lead);
    }
  }
  
  async submitOnline(lead) {
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading
      submitBtn.innerHTML = '⏳ Saving...';
      submitBtn.disabled = true;
      
      // Prepare data in ARRAY format
      const dataToSend = [lead];
      
      console.log('📤 Sending to Sheet.best:', dataToSend);
      
      // Send request
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });
      
      console.log('📨 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Success:', result);
      
      // Success message
      alert('✅ Lead saved to Google Sheets!');
      this.form.reset();
      
    } catch (error) {
      console.error('❌ Online error:', error);
      
      // Fallback to offline
      this.saveOffline(lead);
      alert('⚠️ Online save failed. Saved locally.');
      
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
  
  saveOffline(lead) {
    // Add unique ID
    lead.id = Date.now();
    
    // Save to pending
    this.pendingLeads.push(lead);
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    
    // Update UI
    this.updateUI();
    this.form.reset();
    
    console.log('💾 Saved offline. Total pending:', this.pendingLeads.length);
    alert(`💾 Saved locally! (${this.pendingLeads.length} pending)`);
  }
  
  async trySyncPendingLeads() {
    if (!this.onlineStatus || this.pendingLeads.length === 0) {
      console.log('Sync skipped');
      return;
    }
    
    console.log(`🔄 Syncing ${this.pendingLeads.length} leads...`);
    
    const remaining = [];
    
    for (const lead of [...this.pendingLeads]) {
      try {
        // Remove internal fields
        const dataToSend = {...lead};
        delete dataToSend.id;
        
        console.log(`Syncing: ${lead.email}`);
        
        await fetch(this.API_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify([dataToSend])
        });
        
        console.log(`✅ Synced: ${lead.email}`);
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed: ${lead.email}`, error);
        remaining.push(lead);
      }
    }
    
    // Update storage
    this.pendingLeads = remaining;
    localStorage.setItem('pendingLeads', JSON.stringify(this.pendingLeads));
    this.updateUI();
    
    console.log(`Sync complete. Remaining: ${remaining.length}`);
    
    if (remaining.length === 0) {
      alert('✅ All pending leads synced!');
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Exhibition Form Loading...');
  window.app = new ExhibitionLeadForm();
});