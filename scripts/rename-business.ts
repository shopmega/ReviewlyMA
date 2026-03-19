import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function renameBusiness(oldId: string, newId: string) {
    console.log(`Attempting to rename business: ${oldId} -> ${newId}...`);

    const { error } = await supabase.rpc('rename_business', {
        p_old_id: oldId,
        p_new_id: newId
    });

    if (error) {
        console.error('Error renaming business:', error.message);
        process.exit(1);
    }

    console.log('Successfully renamed business and updated all references.');
    process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 2) {
    renameBusiness(args[0], args[1]);
} else {
    rl.question('Enter OLD business ID (e.g. swissport-6uitd): ', (oldId) => {
        rl.question('Enter NEW business ID (e.g. swissport): ', (newId) => {
            if (oldId && newId) {
                renameBusiness(oldId, newId);
            } else {
                console.error('Both IDs are required.');
                process.exit(1);
            }
        });
    });
}
