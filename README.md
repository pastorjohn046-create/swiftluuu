# Nexus Bank - Admin Portal

A modern mobile banking application with a powerful administrative interface.

## Features

- **Mobile App**: Signup, Login, Dashboard, Transfers, History, Profile.
- **Admin Portal**: User management, balance adjustment, account deletion.
- **Theming**: Light and Dark mode support.
- **Storage**: Cloudinary integration for profile pictures.

## Deployment to Netlify

This project is configured for easy deployment to Netlify.

### 1. Environment Variables

Set the following environment variables in your Netlify dashboard:

- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name.
- `CLOUDINARY_API_KEY`: Your Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret.

### 2. Build Settings

- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### 3. Backend Note

The current backend is implemented in `server.ts` using Express. For a full production deployment on Netlify, you may want to migrate the API routes to [Netlify Functions](https://www.netlify.com/products/functions/).

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)

### Admin Access
Use the following credentials to access the Admin Portal:
- **Email**: `demo@nexus.bank`
- **Role**: Admin (automatically assigned to this email)
