/**
 * Simple no-op fragment shader for reference
 */
precision mediump float; // required

void main() {

    float r = 1.0;
    float g = 1.0;
    float b = 1.0;
    float a = 1.0;

    css_ColorMatrix = mat4( r, 0.0, 0.0, 0.0,
			0.0, g, 0.0, 0.0,
			0.0, 0.0, b, 0.0,
			0.0, 0.0, 0.0, a );
}
