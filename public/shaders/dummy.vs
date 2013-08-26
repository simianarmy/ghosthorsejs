/**
 * A simple no-op vertex shader for reference
 */
precision mediump float; // required

attribute vec4 a_position;
uniform mat4 u_projectionMatrix;

void main() {

    gl_Position = u_projectionMatrix * a_position;

}
