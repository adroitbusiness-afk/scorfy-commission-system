/**
 * Storage Testing Utility
 * Load this in browser console to diagnose storage issues
 * Usage: Copy-paste the output of this test function into browser console
 */

export const testStorageConnection = async () => {
  console.log('🔍 Starting Storage Diagnostic...\n');
  
  const results: { test: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Test 1: List buckets
    console.log('Test 1: Listing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      results.push({
        test: 'List Buckets',
        status: 'FAIL',
        message: `Error: ${listError.message}`
      });
    } else {
      const hasDocuments = buckets?.some(b => b.name === 'documents');
      results.push({
        test: 'List Buckets',
        status: 'PASS',
        message: `Found ${buckets?.length || 0} buckets. Documents bucket: ${hasDocuments ? '✅ EXISTS' : '❌ MISSING'}`
      });
      
      if (!hasDocuments) {
        results.push({
          test: 'Documents Bucket',
          status: 'FAIL',
          message: 'Bucket "documents" not found. You must create it in Supabase Storage UI.'
        });
      } else {
        // Test 2: Try to access documents bucket
        console.log('Test 2: Accessing documents bucket...');
        const { data: files, error: accessError } = await supabase.storage
          .from('documents')
          .list('', { limit: 1 });
        
        if (accessError) {
          results.push({
            test: 'Bucket Access',
            status: 'FAIL',
            message: `Error: ${accessError.message}. Check RLS policies! See STORAGE_DIAGNOSTIC_FIX.md`
          });
        } else {
          results.push({
            test: 'Bucket Access',
            status: 'PASS',
            message: 'Successfully accessed documents bucket'
          });
          
          // Test 3: Check if we can upload a test file
          console.log('Test 3: Testing upload permissions...');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const { data, error: uploadError } = await supabase.storage
              .from('documents')
              .upload(`test/${user.id}/test_${Date.now()}.txt`, testFile, {
                upsert: false
              });
            
            if (uploadError) {
              results.push({
                test: 'Upload Test',
                status: 'FAIL',
                message: `Error: ${uploadError.message}`
              });
            } else {
              results.push({
                test: 'Upload Test',
                status: 'PASS',
                message: `Successfully uploaded test file to ${data?.path}`
              });
              
              // Clean up test file
              await supabase.storage.from('documents').remove([data?.path || '']);
            }
          }
        }
      }
    }
  } catch (err: any) {
    results.push({
      test: 'Connection',
      status: 'FAIL',
      message: `Fatal error: ${err.message}`
    });
  }
  
  // Print results
  console.log('\n📊 DIAGNOSTIC RESULTS:\n');
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  const totalCount = results.length;
  
  console.log(`\n📈 Summary: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('✨ All tests passed! Storage is ready.');
  } else {
    console.log('⚠️ Some tests failed. See STORAGE_DIAGNOSTIC_FIX.md for solutions.');
  }
  
  return {
    passed: passCount,
    total: totalCount,
    details: results
  };
};

// Quick browser console test (copy-paste this):
// const { testStorageConnection } = await import('/lib/storageTest.ts');
// await testStorageConnection();
