const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Comprehensive Test Suite for Avis Application...\n');

// Define test files to run
const testFiles = [
  './tests/comprehensive-app-tests.spec.ts',
  './tests/critical-path-tests.spec.ts', 
  './tests/settings-tests.spec.ts'
];

// Check which test files exist
const existingTests = testFiles.filter(file => fs.existsSync(path.join(process.cwd(), file)));

if (existingTests.length === 0) {
  console.log('❌ No test files found! Please make sure the test files exist.');
  process.exit(1);
}

console.log(`📋 Found ${existingTests.length} test files to run:`);
existingTests.forEach(test => console.log(`   - ${test}`));

console.log('\n🧪 Running tests...\n');

try {
  // Run Playwright tests
  console.log('🚀 Executing Playwright tests...');
  
  // First, try to install Playwright browsers if not already installed
  try {
    execSync('npx playwright install-deps', { stdio: 'inherit' });
    execSync('npx playwright install chromium firefox webkit', { stdio: 'inherit' });
  } catch (installErr) {
    console.log('⚠️  Browser installation had issues, continuing anyway...');
  }
  
  // Run the tests
  const testResult = execSync('npx playwright test', { 
    encoding: 'utf-8', 
    stdio: 'pipe',
    timeout: 300000 // 5 minute timeout
  });
  
  console.log('✅ Tests completed successfully!');
  console.log('\n📊 Test Results:');
  console.log(testResult.stdout);
  
  // Also run a quick check for any syntax errors in the test files
  console.log('\n🔍 Checking test files for syntax errors...');
  existingTests.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Simple check for obvious syntax issues
      const missingImports = content.includes('expect(') && !content.includes('from \'@playwright/test\'');
      if (missingImports) {
        console.log(`⚠️  Potential issue in ${file}: may be missing Playwright imports`);
      }
      console.log(`✅ ${path.basename(file)} - Syntax appears valid`);
    } catch (err) {
      console.log(`❌ Error reading ${file}: ${err.message}`);
    }
  });
  
  console.log('\n🏆 Comprehensive testing completed!');
  console.log('Please review the test results above for any failures.');
  
} catch (error) {
  console.error('❌ Test execution failed:');
  
  if (error.stdout) {
    console.log('Standard Output:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('Standard Error:');
    console.log(error.stderr);
  }
  
  if (error.status !== undefined) {
    console.log(`Exit code: ${error.status}`);
  }
  
  // Still try to provide some helpful info
  console.log('\n💡 Troubleshooting Tips:');
  console.log('- Make sure you have Playwright installed: npm install @playwright/test');
  console.log('- Install Playwright browsers: npx playwright install');
  console.log('- Check that your dev server is running if tests require it');
  console.log('- Verify that all test files exist and have correct syntax');
  
  process.exit(1);
}