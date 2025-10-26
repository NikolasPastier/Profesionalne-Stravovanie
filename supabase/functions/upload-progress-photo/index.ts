import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limit: 10 requests per hour per user
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10;

async function checkRateLimit(supabase: any, userId: string, functionName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('edge_function_rate_limits')
    .select('last_request_at, request_count')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking rate limit:', error);
    return true; // Allow on error to avoid blocking legitimate requests
  }

  if (data) {
    const timeSinceLastRequest = Date.now() - new Date(data.last_request_at).getTime();
    
    if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
      // Within rate limit window
      if (data.request_count >= MAX_REQUESTS_PER_WINDOW) {
        return false; // Rate limit exceeded
      }
      
      // Increment request count
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: data.request_count + 1,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('function_name', functionName);
    } else {
      // Window expired, reset counter
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: 1,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('function_name', functionName);
    }
  } else {
    // First request, create record
    await supabase
      .from('edge_function_rate_limits')
      .insert({
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        last_request_at: new Date().toISOString(),
      });
  }

  return true; // Allowed
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Neautorizovaný prístup' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limit
    const allowed = await checkRateLimit(supabaseClient, user.id, 'upload-progress-photo');
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Prekročený limit nahrávaní. Môžete nahrať maximálne 10 fotografií za hodinu.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Súbor nebol nájdený' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ error: 'Neplatný formát súboru. Povolené sú iba obrázky (JPEG, PNG, WEBP).' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('File too large:', file.size);
      return new Response(
        JSON.stringify({ error: 'Súbor je príliš veľký. Maximálna veľkosť je 5MB.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file content by checking magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const isValidImage = validateImageMagicBytes(uint8Array);

    if (!isValidImage) {
      console.log('Invalid image file - magic bytes check failed');
      return new Response(
        JSON.stringify({ error: 'Súbor nie je platný obrázok.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate server-side filename with UUID for unpredictability
    const fileExtension = getFileExtension(file.type);
    const uuid = crypto.randomUUID();
    const fileName = `${user.id}/${uuid}.${fileExtension}`;

    console.log('Uploading file with UUID:', fileName, 'Size:', file.size, 'Type:', file.type);

    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('progress-photos')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Nepodarilo sa nahrať súbor.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('File uploaded successfully:', fileName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        message: 'Obrázok bol úspešne nahraný'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Neočakávaná chyba pri nahrávaní súboru.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Validate image file by checking magic bytes (file signatures)
function validateImageMagicBytes(bytes: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return true;
  }
  
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return true;
  }
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return true;
  }
  
  return false;
}

// Get proper file extension based on MIME type
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}
