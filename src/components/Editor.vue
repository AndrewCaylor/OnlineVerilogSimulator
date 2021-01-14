<template>
  <div class="main" v-on:click="highlightLine()" @keyup="highlightLine">
    <div style="margin: 1rem">
      <prism-editor
        v-model="verilogCode"
        :highlight="highlighter"
        line-numbers
        class="myEditor"
      ></prism-editor>
    </div>
  </div>
</template>

<script>
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-verilog";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

// import * as util from ".//generateNodeNetwork.ts";
// import * as BitwiseLib from ".//bitwiseLib";
// import { Evaluator } from ".//evaluate";
import { defaultCode } from ".//defaultCode";

export default {
  components: { PrismEditor },
  name: "Editor",
  idCounter: 0,
  props: {},
  data() {
    return {
      verilogCode: "",
      editorRows: 1,
      globalModules: [],
      lastLineNumeber: null, //a number
    };
  },
  methods: {
    highlighter(code) {
      //this module runs whenever a character is typed in the prismjs textbox
      //This is used for prismjs, but also i use it for updating the code in localstorage
      window.localStorage.setItem("default", this.verilogCode);
      return highlight(code, languages.verilog); //returns html
    },
    highlightLine() {
      //should only be one textarea for now
      let mainTextArea = document.getElementsByTagName("textarea")[0];
      //line number the cursor is on
      let lineNumber = mainTextArea.value
        .substr(0, mainTextArea.selectionStart)
        .split("\n").length;

      //gets the line number elements
      let domElements = document.getElementsByClassName(
        "prism-editor__line-number"
      );

      //edits the color attributes of the line number elements
      if (lineNumber != this.lastLineNumeber) {
        domElements[lineNumber - 1].style.color = "white";
        if (this.lastLineNumeber !== null)
          domElements[this.lastLineNumeber - 1].style.color = "#999";
        this.lastLineNumeber = lineNumber;
      }
    },
  },
  beforeMount() {
    this.verilogCode = window.localStorage.getItem("default");

    if (!this.verilogCode) {
      this.verilogCode = defaultCode;
    }
    // this.compile();
  },
};
</script>


<style scoped lang="scss">
//boostrap only applied this module and not body
@import "~bootstrap/scss/bootstrap.scss";
@import "~bootstrap-vue/src/index.scss";

.myEditor {
  font-family: "Courier New", Courier, monospace;
}

.main {
  display: flex;
  flex-direction: left;
  height: 80%;
  height: 100%;
}
</style>