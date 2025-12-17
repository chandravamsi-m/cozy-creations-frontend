import { collection, query, where, orderBy, getDocs, limit, startAfter, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function fetchFirestoreProducts(category = "") {
  try {
    const constraints = [where("isActive", "==", true)];

    if (category) {
      constraints.push(where("category", "==", category));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(collection(db, "products"), ...constraints);

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
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
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}
