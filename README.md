# Multi-Tenant Family Photo Album

A secure, multi-tenant photo album application built with Next.js and Supabase. Each family gets their own private, isolated space to upload photos and track life skills progress.

## Features

- 🔐 **Multi-tenant Architecture**: Complete data isolation between families
- 📸 **Photo Upload & Management**: Upload photos/videos with titles and descriptions
- 🎯 **Skills Tracking**: Monitor progress on important life skills (0-100%)
- 🔒 **Secure Authentication**: Email/password auth with automatic family creation
- 📱 **Responsive Design**: Works perfectly on mobile and desktop
- ⚡ **Real-time Updates**: Instant updates across the application

## Technology Stack

- **Frontend**: Next.js (Pages Router) with React
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **Security**: Row Level Security (RLS) for multi-tenancy

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the complete SQL script from `supabase-schema.sql`
3. Create a storage bucket:
   - Go to Storage in your Supabase dashboard
   - Create a new public bucket named `album_uploads`
4. Get your project credentials:
   - Go to Settings → API
   - Copy your Project URL and anon public key

### 2. Environment Configuration

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Database Schema

### Core Tables

- **families**: Each family is a separate tenant
- **profiles**: Links users to their families
- **photos**: Stores photo metadata with family isolation
- **skills**: Tracks life skills progress per family

### Security Model

Row Level Security (RLS) ensures that:
- Users can only see data from their own family
- All operations are automatically scoped to the user's family
- Complete isolation between different families

## Usage

1. **Sign Up**: Create a new family account (automatically creates a family)
2. **Upload Photos**: Add photos with titles and descriptions
3. **View Gallery**: Browse photos in a responsive grid layout
4. **Track Skills**: Add life skills and update progress (0-100%)
5. **Multi-Family**: Each family sees only their own data

## File Structure

```
├── components/
│   ├── Header.js          # Navigation with sign-out
│   ├── UploadForm.js      # Photo upload component
│   ├── PhotoGallery.js    # Photo grid with modal view
│   └── SkillsTracker.js   # Skills management
├── lib/
│   ├── supabaseClient.js  # Supabase configuration
│   └── auth.js            # Authentication helpers
├── pages/
│   ├── index.js           # Landing page
│   ├── signup.js          # Family registration
│   ├── login.js           # User authentication
│   └── dashboard.js       # Main application
├── styles/
│   └── globals.css        # Tailwind + custom styles
└── supabase-schema.sql    # Complete database setup
```

## Security Features

- **Row Level Security**: Database-level access control
- **Automatic Family Creation**: New users get their own family
- **File Upload Security**: Files are scoped to family folders
- **Session Management**: Secure authentication with Supabase
- **Input Validation**: Client and server-side validation

## Deployment

This app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- Any Node.js hosting platform

Remember to set environment variables in your deployment platform.

## Customization

The app is built with modularity in mind:
- Easy to add new features
- Customizable styling with Tailwind
- Extensible database schema
- Component-based architecture

## Support

For issues or questions about this implementation, check the code comments and Supabase documentation.