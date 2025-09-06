import { getPublishedBanners } from './actions';
import { PublishedBannersClient } from './client';

export default async function PublishedPage() {
  const banners = await getPublishedBanners();
  banners.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
  });

  return <PublishedBannersClient initialBanners={banners} />;
}
