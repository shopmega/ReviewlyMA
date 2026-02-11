const { createClient } = require('@supabase/supabase-js');

async function clearAppData() {
  console.log('Starting to clear application data...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env.local file.');
    console.log('Expected variables:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Clear reviews data
    console.log('Clearing reviews...');
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (reviewsError) {
      console.error('Error clearing reviews:', reviewsError);
    } else {
      console.log('Reviews cleared successfully.');
    }

    // Clear updates data
    console.log('Clearing updates...');
    const { error: updatesError } = await supabase
      .from('updates')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (updatesError) {
      console.error('Error clearing updates:', updatesError);
    } else {
      console.log('Updates cleared successfully.');
    }

    // Clear salaries data (if exists)
    const { error: salariesError } = await supabase
      .from('salaries')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (salariesError) {
      console.error('Error clearing salaries:', salariesError);
    } else {
      console.log('Salaries cleared successfully.');
    }

    // Clear interviews data (if exists)
    const { error: interviewsError } = await supabase
      .from('interviews')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (interviewsError) {
      console.error('Error clearing interviews:', interviewsError);
    } else {
      console.log('Interviews cleared successfully.');
    }

    // Clear saved businesses data (if exists)
    const { error: savedBusinessesError } = await supabase
      .from('saved_businesses')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (savedBusinessesError) {
      console.error('Error clearing saved businesses:', savedBusinessesError);
    } else {
      console.log('Saved businesses cleared successfully.');
    }

    // Clear business claims data (if exists)
    const { error: businessClaimsError } = await supabase
      .from('business_claims')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (businessClaimsError) {
      console.error('Error clearing business claims:', businessClaimsError);
    } else {
      console.log('Business claims cleared successfully.');
    }

    // Clear seasonal collections data (if exists)
    const { error: seasonalCollectionsError } = await supabase
      .from('seasonal_collections')
      .delete()
      .neq('id', -1); // Delete all records
    
    if (seasonalCollectionsError) {
      console.error('Error clearing seasonal collections:', seasonalCollectionsError);
    } else {
      console.log('Seasonal collections cleared successfully.');
    }

    // Note: We're NOT clearing the businesses table as that would remove business profiles
    // Note: We're NOT clearing the profiles table as that would remove user accounts
    // Note: We're NOT clearing the site_settings table as that contains important app settings

    console.log('\nApplication data cleared successfully!');
    console.log('Database structure and configuration preserved.');
    console.log('Business profiles and user accounts remain intact.');
  } catch (error) {
    console.error('Unexpected error during data clearing:', error);
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  clearAppData().catch(error => {
    console.error('Failed to clear app data:', error);
    process.exit(1);
  });
}

module.exports = clearAppData;