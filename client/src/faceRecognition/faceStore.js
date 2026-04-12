// faceStore.js
// Persistent face descriptor storage using localStorage
// Replace localStorage calls with API calls when MongoDB is ready

const STORAGE_KEY = 'attendance_face_descriptors';

// Load all faces from localStorage
export const loadFaces = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Save a face descriptor permanently
export const saveFaceDescriptor = (student, descriptor) => {
  try {
    const faces = loadFaces();
    // Remove existing entry if re-registering
    const updated = faces.filter(f => f.id !== student._id);
    updated.push({
      id:          student._id,
      name:        student.name,
      rollNumber:  student.rollNumber,
      class:       student.class,
      descriptor:  Array.from(descriptor),
      registeredAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log(`✅ Face saved permanently for ${student.name}`);
    return true;
  } catch (err) {
    console.error('Failed to save face:', err);
    return false;
  }
};

// Delete a face descriptor
export const deleteFaceDescriptor = (studentId) => {
  try {
    const faces = loadFaces();
    const updated = faces.filter(f => f.id !== studentId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
};

// Get all registered faces (for matching)
export const getRegisteredFaces = () => {
  return loadFaces().map(f => ({
    ...f,
    descriptor: new Float32Array(f.descriptor),
  }));
};

// Check if a student has a registered face
export const hasFace = (studentId) => {
  return loadFaces().some(f => f.id === studentId);
};

// Get face info for one student
export const getFaceInfo = (studentId) => {
  return loadFaces().find(f => f.id === studentId) || null;
};

// Clear all faces
export const clearAllFaces = () => {
  localStorage.removeItem(STORAGE_KEY);
};