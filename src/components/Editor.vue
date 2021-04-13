<template>
  <div class="main" v-on:click="highlightLine()" @keyup="highlightLine">
    <div style="margin: 1rem; width: 100%">
      <prism-editor
        v-model="verilogCode"
        :highlight="highlighter"
        line-numbers
        class="myEditor"
      ></prism-editor>
    </div>
    <template v-if="showError">
      <ErrorPopup :errorObj="errorData" />
    </template>
  </div>
</template>

<script>
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-verilog";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

import ErrorPopup from "./ErrorPopup";

// import * as util from ".//generateNodeNetwork.ts";
// import * as BitwiseLib from ".//bitwiseLib";
import { getError } from ".//evaluate";
import { defaultCode } from ".//defaultCode";

var map = {};
onkeydown = onkeyup = function (e) {
  map[e.key] = e.type == "keydown";
};

export default {
  components: { PrismEditor, ErrorPopup },
  name: "Editor",
  idCounter: 0,
  props: ["isCompileError"],
  data() {
    return {
      verilogCode: "",
      editorRows: 1,
      globalModules: [],
      lastLineNumeber: null, //a number
      showError: false,
      errorData: null,
      lastPos: null,
    };
  },
  methods: {
    showErrorIfError() {
      let error = getError(this.verilogCode);
      if (error) {
        this.errorData = error;
        console.log(error.message);
      } else {
        console.log("no error");
      }
      this.showError = !!error;
      this.$emit("isCompileError", this.showError);
      //TODO: disable user from running code when there is an error
    },
    highlighter(code) {
      //this module runs whenever a character is typed in the prismjs textbox
      //This is used for prismjs, but also i use it for updating the code in localstorage
      window.localStorage.setItem("default", this.verilogCode);
      return highlight(code, languages.verilog); //returns html
    },
    //runs on every onclick
    highlightLine() {
      let mainTextArea = document.getElementsByTagName("textarea")[0];

      //when text is replaced, it automatically moves the cursor to the end,
      //this is needed to reset it
      if (this.lastPos !== null) {
        mainTextArea.selectionEnd = this.lastPos;
        this.lastPos = null;
      }
      //allows using ctrl + / to comment a line!
      if (map.Control && map["/"]) {
        this.lastPos = mainTextArea.selectionEnd;

        let arr = this.verilogCode.split("\n");
        if (arr[this.lastLineNumeber - 1].includes("//")) {
          arr[this.lastLineNumeber - 1] = arr[this.lastLineNumeber - 1].replace(
            "//",
            ""
          );
          this.lastPos = mainTextArea.selectionEnd - 2;
        } else {
          arr[this.lastLineNumeber - 1] = "//" + arr[this.lastLineNumeber - 1];
          this.lastPos = mainTextArea.selectionEnd + 2;
        }
        this.verilogCode = arr.join("\n");
      }
      //should only be one textarea for now
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

      this.showErrorIfError();
    },
  },
  beforeMount() {
    this.verilogCode = window.localStorage.getItem("default");

    if (!this.verilogCode) {
      this.verilogCode = defaultCode;
    }
    this.showErrorIfError();
  },
};
</script>


<style scoped lang="scss">
//boostrap only applied this module and not body
@import "~bootstrap/scss/bootstrap.scss";
@import "~bootstrap-vue/src/index.scss";

.myEditor {
  font-family: "Courier New", Courier, monospace;
  padding-bottom: 5rem;
}

.main {
  display: flex;
  flex-direction: left;
  height: 80%;
  height: 100%;
}
</style>