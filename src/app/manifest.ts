import { MetadataRoute } from 'next';
import { RESUME_DATA } from '@/data/resume-data';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${RESUME_DATA.name} - AI Engineer Portfolio`,
    short_name: RESUME_DATA.name,
    description: RESUME_DATA.summary,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4A90E2',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
