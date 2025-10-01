// supabase.js - Supabase configuration and functions

// Supabase configuration
const SUPABASE_URL = 'https://muvwkhnbfdatotzjwluu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dndraG5iZmRhdG90emp3bHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTcwODgsImV4cCI6MjA2ODQzMzA4OH0.hAUYw2jEjWOdSri6KBolX8BXmp80vOxWysNv6VYe5Io';

// Import Supabase client
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Initialize Supabase client
let supabase;
let isInitialized = false;

try {
    console.log('Initializing Supabase...');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isInitialized = true;
    console.log('✅ Supabase initialized successfully');
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    isInitialized = false;
}

// =============== AUTHENTICATION FUNCTIONS ===============

// Verify PIN against Supabase database
export async function verifyPin(pin) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('🔐 Verifying PIN...');

        // Call the secure RPC function to verify PIN
        const { data, error } = await supabase
            .rpc('verify_pin', { input_pin: pin });

        if (error) {
            console.error('❌ PIN verification error:', error);
            return { success: false, role: null };
        }

        if (!data || data.length === 0) {
            console.log('❌ Invalid PIN');
            return { success: false, role: null };
        }

        const result = data[0];
        console.log('✅ PIN verified successfully, role:', result.role);
        return { success: result.success, role: result.role };

    } catch (error) {
        console.error('❌ Error verifying PIN:', error);
        return { success: false, role: null };
    }
}

// Create a new auth session
export async function createAuthSession(userId, role) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('🔑 Creating auth session for user:', userId, 'role:', role);

        // Call the RPC function to create a session
        const { data, error } = await supabase
            .rpc('create_auth_session', { 
                user_id: userId,
                user_role: role
            });

        if (error) {
            console.error('❌ Session creation error:', error);
            return null;
        }

        console.log('✅ Session created successfully, ID:', data);
        return data; // This is the session ID

    } catch (error) {
        console.error('❌ Error creating session:', error);
        return null;
    }
}

// Verify session
export async function verifySession(sessionId) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        if (!sessionId) {
            console.log('⚠️ No session ID provided');
            return { valid: false, role: null, userId: null };
        }

        console.log('🔍 Verifying session:', sessionId);

        // Call the RPC function to verify the session
        const { data, error } = await supabase
            .rpc('verify_session', { session_id: sessionId });

        if (error) {
            console.error('❌ Session verification error:', error);
            return { valid: false, role: null, userId: null };
        }

        if (!data || data.length === 0) {
            console.log('❌ Invalid or expired session');
            return { valid: false, role: null, userId: null };
        }

        const result = data[0];
        console.log('✅ Session verified, valid:', result.valid, 'role:', result.role);
        return { 
            valid: result.valid, 
            role: result.role, 
            userId: result.user_id 
        };

    } catch (error) {
        console.error('❌ Error verifying session:', error);
        return { valid: false, role: null, userId: null };
    }
}

// =============== STORAGE FUNCTIONS ===============

// Helper function to generate unique filename
function generateFileName(originalName) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomId}.${extension}`;
}

// Upload file to Supabase Storage
export async function uploadFileToStorage(file, folder = 'photos') {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('📤 Uploading file:', file.name, 'Size:', Math.round(file.size / 1024) + 'KB');

        // Generate unique filename
        const fileName = generateFileName(file.name);
        const filePath = `${folder}/${fileName}`;

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from('family-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('❌ Storage upload error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        console.log('✅ File uploaded successfully:', data.path);

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('family-photos')
            .getPublicUrl(filePath);

        console.log('✅ Public URL generated:', urlData.publicUrl);
        
        return {
            url: urlData.publicUrl,
            path: filePath,
            fileName: fileName
        };

    } catch (error) {
        console.error('❌ Error uploading file:', error);
        throw new Error('Încărcarea fișierului a eșuat: ' + error.message);
    }
}

// =============== DATABASE FUNCTIONS ===============

// Save photo/video data to Supabase
export async function savePhotoToFirestore(photoData) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('💾 Saving photo to Supabase database...');
        console.log('Photo data:', {
            description: photoData.description,
            hashtags: photoData.hashtags,
            category: photoData.category,
            type: photoData.type
        });

        const dbData = {
            description: photoData.description || '',
            hashtags: photoData.hashtags || '',
            category: photoData.category || 'family',
            type: photoData.type || 'image',
            file_name: photoData.fileName || '',
            file_size: photoData.fileSize || 0,
            uploaded_by: photoData.uploadedBy || null
        };

        // Insert into photos table
        const { data, error } = await supabase
            .from('photos')
            .insert([dbData])
            .select();

        if (error) {
            console.error('❌ Database save error:', error);
            throw new Error(`Database save failed: ${error.message}`);
        }

        console.log('✅ Photo saved successfully with ID:', data[0].id);
        return data[0].id;

    } catch (error) {
        console.error('❌ Error saving photo to database:', error);
        throw new Error('Salvarea fotografiei a eșuat: ' + error.message);
    }
}

// Load all photos from Supabase
export async function loadPhotosFromFirestore() {
    try {
        if (!isInitialized) {
            console.log('⚠️ Supabase not initialized, returning empty array');
            return [];
        }

        console.log('📥 Loading photos from Supabase...');

        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading photos:', error);
            return [];
        }

        console.log('✅ Successfully loaded', data.length, 'photos from Supabase');

        // Transform data to match app format
        const photos = data.map(photo => ({
            id: photo.id,
            description: photo.description || '',
            hashtags: photo.hashtags || '',
            category: photo.category || 'family',
            type: photo.type || 'image',
            url: photo.file_name ? getPhotoUrl(photo.file_name) : '',
            timestamp: new Date(photo.created_at)
        }));

        return photos;

    } catch (error) {
        console.error('❌ Error loading photos from Supabase:', error);
        return [];
    }
}

// Helper function to get photo URL from filename
function getPhotoUrl(fileName) {
    if (!fileName) return '';
    
    // Check if it's a video file
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    const isVideo = videoExtensions.some(ext => fileName.toLowerCase().includes(ext));
    
    const folder = isVideo ? 'videos' : 'photos';
    
    const { data } = supabase.storage
        .from('family-photos')
        .getPublicUrl(`${folder}/${fileName}`);
        
    return data.publicUrl;
}

// =============== SKILLS FUNCTIONS ===============

// Save custom skill to Supabase
export async function saveSkillToFirestore(skillData) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('💾 Saving custom skill to Supabase:', skillData.name);

        const { data, error } = await supabase
            .from('skills')
            .insert([{
                name: skillData.name,
                progress: skillData.progress || 0,
                color: skillData.color || 'blue',
                icon: skillData.icon || '⭐',
                is_predefined: false, // This is a custom skill
                created_by: null // We'll add auth later
            }])
            .select();

        if (error) {
            console.error('❌ Error saving custom skill:', error);
            throw new Error(`Skill save failed: ${error.message}`);
        }

        console.log('✅ Custom skill saved with ID:', data[0].id);
        return data[0].id;

    } catch (error) {
        console.error('❌ Error saving custom skill:', error);
        throw new Error('Salvarea abilității a eșuat: ' + error.message);
    }
}

// Load all custom skills from Supabase
export async function loadSkillsFromFirestore() {
    try {
        if (!isInitialized) {
            console.log('⚠️ Supabase not initialized, returning empty array');
            return [];
        }

        console.log('📥 Loading custom skills from Supabase...');

        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .eq('is_predefined', false) // Only load custom skills
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading custom skills:', error);
            return [];
        }

        console.log('✅ Successfully loaded', data.length, 'custom skills from Supabase');
        return data || [];

    } catch (error) {
        console.error('❌ Error loading custom skills from Supabase:', error);
        return [];
    }
}

// Load predefined skills progress from Supabase
export async function loadPredefinedSkillsFromSupabase() {
    try {
        if (!isInitialized) {
            console.log('⚠️ Supabase not initialized, returning empty array');
            return [];
        }

        console.log('📥 Loading predefined skills from Supabase...');

        const { data, error } = await supabase
            .from('predefined_skills')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading predefined skills:', error);
            return [];
        }

        console.log('✅ Successfully loaded', data.length, 'predefined skills from Supabase');
        return data || [];

    } catch (error) {
        console.error('❌ Error loading predefined skills from Supabase:', error);
        return [];
    }
}

// Update or create predefined skill progress in Supabase
export async function updatePredefinedSkillProgress(presetId, newProgress) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('📊 Updating predefined skill progress:', presetId, 'to', newProgress + '%');

        // First try to update existing record
        const { data: existingData, error: selectError } = await supabase
            .from('predefined_skills')
            .select('*')
            .eq('preset_id', presetId)
            .single();

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('❌ Error checking existing predefined skill:', selectError);
            throw new Error(`Check failed: ${selectError.message}`);
        }

        if (existingData) {
            // Update existing record
            const { data, error } = await supabase
                .from('predefined_skills')
                .update({ progress: newProgress })
                .eq('preset_id', presetId)
                .select();

            if (error) {
                console.error('❌ Error updating predefined skill progress:', error);
                throw new Error(`Progress update failed: ${error.message}`);
            }

            console.log('✅ Predefined skill progress updated successfully');
            return data[0];
        } else {
            // Create new record
            const { data, error } = await supabase
                .from('predefined_skills')
                .insert([{
                    preset_id: presetId,
                    progress: newProgress,
                    created_by: null // We'll add auth later
                }])
                .select();

            if (error) {
                console.error('❌ Error creating predefined skill progress:', error);
                throw new Error(`Progress creation failed: ${error.message}`);
            }

            console.log('✅ Predefined skill progress created successfully');
            return data[0];
        }

    } catch (error) {
        console.error('❌ Error updating predefined skill progress:', error);
        throw new Error('Actualizarea progresului a eșuat: ' + error.message);
    }
}

// Update custom skill progress in Supabase
export async function updateSkillProgress(skillId, newProgress) {
    try {
        if (!isInitialized) {
            throw new Error('Supabase not initialized');
        }

        console.log('📊 Updating custom skill progress:', skillId, 'to', newProgress + '%');

        const { data, error } = await supabase
            .from('skills')
            .update({ progress: newProgress })
            .eq('id', skillId)
            .select();

        if (error) {
            console.error('❌ Error updating custom skill progress:', error);
            throw new Error(`Progress update failed: ${error.message}`);
        }

        console.log('✅ Custom skill progress updated successfully');
        return data[0];

    } catch (error) {
        console.error('❌ Error updating custom skill progress:', error);
        throw new Error('Actualizarea progresului a eșuat: ' + error.message);
    }
}

// =============== LEGACY COMPATIBILITY FUNCTIONS ===============

// These functions are included for backward compatibility
export function onAuthChange(callback) {
    console.log('🔄 Legacy onAuthChange called - using compatibility mode');
    // Call the callback with a mock user
    setTimeout(() => {
        callback({ uid: null });
    }, 100);
    
    // Return dummy unsubscribe function
    return () => {};
}

export function getCurrentUser() {
    console.log('🔄 Legacy getCurrentUser called - using compatibility mode');
    return { uid: null };
}

// =============== UTILITY FUNCTIONS ===============

// Check if Supabase is ready
export function isFirebaseReady() {
    return isInitialized;
}

// Get initialization status
export function getInitializationStatus() {
    return {
        isInitialized,
        supabaseUrl: SUPABASE_URL,
        hasSupabase: !!supabase
    };
}

// Test connection
export async function testConnection() {
    try {
        if (!isInitialized) {
            return { success: false, error: 'Not initialized' };
        }

        // Test database connection
        const { data, error } = await supabase
            .from('photos')
            .select('count')
            .limit(1);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, message: 'Connection successful' };

    } catch (error) {
        return { success: false, error: error.message };
    }
}