import axios from 'axios';

// Copy the helper function exactly from HomepageOfferSection.tsx
const getProductImageUrl = (product) => {
  if (!product || !product.images || product.images.length === 0) return '/logo.png';
  const img = product.images[0];
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object' && img.url) return img.url;
  return '/logo.png';
};

const run = async () => {
  try {
    const res = await axios.get('http://localhost:3006/api/homepage-offer');
    const offer = res.data.data;
    console.log("Offer title:", offer.title);
    console.log("Offer products count:", offer.products?.length);
    
    if (offer.products && offer.products.length > 0) {
      offer.products.forEach((product, idx) => {
        console.log(`\nProduct [${idx}]:`, product.name);
        console.log("Raw Images field:", JSON.stringify(product.images));
        console.log("Resolved Image URL:", getProductImageUrl(product));
      });
    } else {
      console.log("No products found in offer");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
};

run();
