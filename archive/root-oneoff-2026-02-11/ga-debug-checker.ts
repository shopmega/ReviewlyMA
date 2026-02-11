#!/usr/bin/env node

/**
 * Google Analytics Implementation Diagnostic Tool
 * 
 * This script checks the GA4 implementation and helps identify common issues
 * that prevent data from appearing in Google Analytics.
 */

async function checkGAImplementation() {
  console.log('🔍 Google Analytics Implementation Diagnostic\n');

  // Check 1: Environment Variables
  console.log('📋 CHECK 1: Environment Configuration');
  console.log('=====================================');
  
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (gaId) {
    console.log(`✅ NEXT_PUBLIC_GA_ID found: ${gaId}`);
  } else {
    console.log('❌ NEXT_PUBLIC_GA_ID not found in environment variables');
    console.log('   Solution: Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX to .env.local');
  }
  console.log('');

  // Check 2: Admin Settings
  console.log('📋 CHECK 2: Admin Panel Configuration');
  console.log('=====================================');
  
  try {
    // Simulate checking admin settings table
    console.log('ℹ️  Would check database table "site_settings" for google_analytics_id field');
    console.log('   Query: SELECT google_analytics_id FROM site_settings LIMIT 1;');
    console.log('');
  } catch (error) {
    console.log('❌ Could not connect to database to check admin settings');
  }

  // Check 3: Component Integration
  console.log('📋 CHECK 3: Component Integration');
  console.log('==================================');
  
  const fs = require('fs');
  const path = require('path');
  
  const layoutPath = path.join(__dirname, 'src', 'app', 'layout.tsx');
  try {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (layoutContent.includes('GoogleAnalytics')) {
      console.log('✅ GoogleAnalytics component found in root layout');
    } else {
      console.log('❌ GoogleAnalytics component NOT found in root layout');
    }
  } catch (error) {
    console.log('❌ Could not read layout file');
  }
  console.log('');

  // Check 4: Script Loading Verification
  console.log('📋 CHECK 4: Script Loading (Browser Test)');
  console.log('==========================================');
  console.log('Run this in browser console to verify GA script loading:');
  console.log(`
    // Check if gtag is loaded
    if (typeof gtag !== 'undefined') {
      console.log('✅ gtag function is available');
    } else {
      console.log('❌ gtag function is NOT available');
    }
    
    // Check if dataLayer exists
    if (window.dataLayer) {
      console.log('✅ dataLayer array exists');
      console.log('dataLayer length:', window.dataLayer.length);
    } else {
      console.log('❌ dataLayer array does NOT exist');
    }
    
    // Check for GA script
    const gaScripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
    if (gaScripts.length > 0) {
      console.log('✅ GA script tag found:', gaScripts.length, 'instances');
      gaScripts.forEach((script, index) => {
        console.log('  Script', index + 1, ':', script.src);
      });
    } else {
      console.log('❌ No GA script tags found');
    }
  `);
  console.log('');

  // Check 5: Event Tracking Test
  console.log('📋 CHECK 5: Event Tracking Test');
  console.log('================================');
  console.log('Run this in browser console to test event tracking:');
  console.log(`
    // Test manual event tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'debug_test', {
        'custom_parameter': 'test_value',
        'timestamp': new Date().toISOString()
      });
      console.log('✅ Test event sent to GA');
    } else {
      console.log('❌ Cannot send test event - gtag not available');
    }
  `);
  console.log('');

  // Check 6: Common Issues
  console.log('📋 CHECK 6: Common Issues Checklist');
  console.log('===================================');
  console.log('🔍 Verify these common issues:');
  console.log('1. GA Measurement ID format: Should be G-XXXXXXXXXX (not UA-XXXXXXXXX)');
  console.log('2. GA4 property created (not Universal Analytics)');
  console.log('3. Proper domain configured in GA property settings');
  console.log('4. No ad blockers interfering with GA script');
  console.log('5. Correct timezone and currency settings in GA');
  console.log('6. Enhanced measurement enabled for automatic tracking');
  console.log('7. Data retention period set appropriately');
  console.log('');

  // Check 7: Real-time Data Test
  console.log('📋 CHECK 7: Real-time Data Verification');
  console.log('=======================================');
  console.log('Steps to verify real-time data:');
  console.log('1. Open Google Analytics dashboard');
  console.log('2. Navigate to Real-time > Overview');
  console.log('3. Refresh your website in another tab');
  console.log('4. Watch for visitor count to increase within 30 seconds');
  console.log('5. If no data appears, check the items above');
  console.log('');

  // Recommendations
  console.log('📋 RECOMMENDATIONS');
  console.log('==================');
  console.log('🔧 Immediate fixes needed:');
  
  if (!gaId) {
    console.log('- Add NEXT_PUBLIC_GA_ID to .env.local with your GA4 Measurement ID');
  }
  
  console.log('- Verify GA4 property is created (not Universal Analytics)');
  console.log('- Ensure domain is whitelisted in GA property settings');
  console.log('- Test with incognito/private browsing to avoid ad blocker interference');
  console.log('- Enable enhanced measurement in GA4 property settings');
  console.log('- Check GA4 data stream configuration');
  console.log('');

  console.log('📊 Debugging Tools:');
  console.log('- Google Analytics Debugger Chrome Extension');
  console.log('- Google Tag Assistant (Legacy)');
  console.log('- GA4 DebugView in GA dashboard');
  console.log('- Browser developer tools Network tab');
  console.log('');

  console.log('⏰ Timeline Expectations:');
  console.log('- Real-time data: Within 30 seconds');
  console.log('- Standard reports: 24-48 hours processing time');
  console.log('- Some reports may take up to 72 hours for first data');
  console.log('');
}

// Run the diagnostic
checkGAImplementation().catch(console.error);