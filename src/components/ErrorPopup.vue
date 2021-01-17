<template>
  <div>
    <div class="popupContainer">
      <span style="color: #f33">Error</span> on line {{ errorObj.lineNumber }}:
      <div style="color: #ccc; margin-left: 2rem; margin-top: .25rem">
        {{ errorObj.message }}
      </div>
    </div>
    <!-- <div class="resizable" id="resizeMe">
      <div class="resizer resizer-b"></div>

      Error on line: {{errorObj.lineNumber}} <br>
      {{errorObj.message}}
    </div> -->
  </div>
</template>

<script>
// import * as util from ".//generateNodeNetwork.ts";
// import * as BitwiseLib from ".//bitwiseLib";
// import { Evaluator } from ".//evaluate";
// import VueResizable from 'vue-resizable'

export default {
  components: {},
  name: "ErrorPopup",
  idCounter: 0,
  props: { errorObj: null },
  data() {
    return {};
  },
  methods: {
    beforeMount() {
      console.log("tried");
    },
  },
};

//uncomment to allow user to increase height of the div like in vscode
// document.addEventListener("DOMContentLoaded", function () {
//   // Query the element
//   const ele = document.getElementById("resizeMe");

//   // The current position of mouse
//   let y = 0;

//   // The dimension of the element
//   let h = 0;

//   // Handle the mousedown event
//   // that's triggered when user drags the resizer
//   const mouseDownHandler = function (e) {
//     // Get the current mouse position
//     y = e.clientY;

//     // Calculate the dimension of element
//     const styles = window.getComputedStyle(ele);
//     h = parseInt(styles.height, 10);
//     console.log(styles);

//     // Attach the listeners to `document`
//     document.addEventListener("mousemove", mouseMoveHandler);
//     document.addEventListener("mouseup", mouseUpHandler);
//     console.log("down");
//   };

//   const mouseMoveHandler = function (e) {
//     // How far the mouse has been moved
//     const dy = y - e.clientY;

//     // Adjust the dimension of element
//     ele.style.height = `${h + dy}px`;
//     // ele.style.
//     console.log("moving");
//   };

//   const mouseUpHandler = function () {
//     // Remove the handlers of `mousemove` and `mouseup`
//     document.removeEventListener("mousemove", mouseMoveHandler);
//     document.removeEventListener("mouseup", mouseUpHandler);
//   };

//   // Query all resizers
//   const resizers = ele.querySelectorAll(".resizer");

//   // Loop over them
//   [].forEach.call(resizers, function (resizer) {
//     resizer.addEventListener("mousedown", mouseDownHandler);
//   });
// });
</script>


<style scoped lang="scss">
//boostrap only applied this module and not body
@import "~bootstrap/scss/bootstrap.scss";
@import "~bootstrap-vue/src/index.scss";

.popupContainer {
  font-family: Consolas, monospace;
  position: fixed;
  text-align: left;
  bottom: 0;
  left: 0;
  width: 100%;
  border-top: solid white 1px;
  background-color: #16161c;
  height: 4.5rem;
  padding-top: .75rem;
  padding-bottom: 1rem;
  padding-left: 4rem;
}

//uncomment to allow user to increase height of the div like in vscode
// .resizable {
//   position: fixed;
//   bottom: 0;
//   left: 0;
//   width: 100%;
//   border-top: solid white 1px;
//   background-color: #16161c;
// }
// .resizer {
//   position: absolute;
// }
/* Placed at the bottom side */
// .resizer-b {
//   top: 0;
//   cursor: row-resize;
//   height: 10px;
//   left: 0;
//   width: 100%;
// }
</style>