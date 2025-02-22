function webGLSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

if (!webGLSupported()) {
  const mapContainer = document.getElementById('map');
  mapContainer.innerHTML = '<p>Sorry, your browser does not support WebGL. This application requires WebGL to run.</p>';
}
