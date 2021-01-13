<template>
  <div class="main">
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
    };
  },
  methods: {
    highlighter(code) {
      //this module runs whenever a character is typed in the prismjs textbox
      //This is used for prismjs, but also i use it for updating the code in localstorage
      window.localStorage.setItem("default", this.verilogCode);
      return highlight(code, languages.verilog); //returns html
    },
  },
  beforeMount() {
    this.verilogCode = window.localStorage.getItem("default");
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