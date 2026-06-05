import { collection, query, where, orderBy, getDocs, limit, startAfter, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function fetchFirestoreProducts(category = "", includeInactive = false) {
  try {
    const constraints = [];

    if (!includeInactive) {
      constraints.push(where("isActive", "==", true));
    }

    if (category) {
      constraints.push(where("category", "==", category));
    }

    const q = query(collection(db, "products"), ...constraints);

    const snap = await getDocs(q);

    const docs = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        bulkPricingTiers: data.bulkPricingTiers || data.bulkPricing || []
      };
    });

    // Client-side sort to avoid complex index requirements
    return docs.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (e) {
    console.error("Firestore fetch error:", e);
    return [];
  }
}

export async function getProductByIdFirestore(id) {
  try {
    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return { 
      id: snap.id, 
      ...data,
      bulkPricingTiers: data.bulkPricingTiers || data.bulkPricing || []
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

async function fetchCollectionFromFirestore(collectionName, includeInactive = false) {
  try {
    const constraints = [];
    if (!includeInactive) {
      constraints.push(where("isActive", "==", true));
    }
    const q = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    return docs.sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.updatedAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || b.updatedAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (e) {
    console.error(`Firestore fetch error for ${collectionName}:`, e);
    return [];
  }
}

export async function fetchFirestoreScentedSticks(includeInactive = false) {
  return fetchCollectionFromFirestore("scented-sticks", includeInactive);
}

export async function fetchFirestorePerfumes(includeInactive = false) {
  return fetchCollectionFromFirestore("perfumes", includeInactive);
}

