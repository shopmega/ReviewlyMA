import { createClient } from '@supabase/supabase-js';

async function checkGAIdInDB() {
  const supabase = createClient(
    'https://vsqzhlpntcbamdbqvyoq.supabase.co',
    'sb_publishable_n53bWP8XcCBLy6vQEpNjGw_pjHAS5oG'
  );

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('google_analytics_id')
      .limit(1);

    if (error) {
      console.log('❌ Database error:', error.message);
      return;
    }

    const gaId = data?.[0]?.google_analytics_id;
    if (gaId) {
      console.log('✅ GA ID found in database:', gaId);
      
      // Also check if it's in env file
      const envGaId = process.env.NEXT_PUBLIC_GA_ID;
      if (envGaId) {
        console.log('✅ GA ID also in environment variables:', envGaId);
        if (gaId === envGaId) {
          console.log('✅ Both values match');
        } else {
          console.log('⚠️  Values do NOT match!');
          console.log('   Database:', gaId);
          console.log('   Environment:', envGaId);
        }
      } else {
        console.log('❌ GA ID missing from environment variables');
        console.log('   Add this to .env.local:');
        console.log(`   NEXT_PUBLIC_GA_ID=${gaId}`);
      }
    } else {
      console.log('❌ No GA ID found in database');
      console.log('   Please add it in Admin Panel > Paramètres > Analytics & Tracking');
    }
  } catch (error) {
    console.log('❌ Error connecting to database:', error);
  }
}

checkGAIdInDB();