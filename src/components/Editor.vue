<template>
  <div class="main">
    <div>
      <div style="padding-bottom: 1em">
        <button
          type="button"
          class="btn btn-secondary"
          v-on:click="generateNetwork()"
        >
          generate network
        </button>
      </div>
      <prism-editor
        v-model="verilogCode"
        :highlight="highlighter"
        line-numbers
        class="myEditor"
      ></prism-editor>
    </div>

    <p>
      {{ generateNetwork() }}
    </p>
    <CompileLogic />
  </div>
</template>

<script>
import CompileLogic from "./CompileLogic.vue";

import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-verilog";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

import * as util from ".//generateNodeNetwork";

export default {
  components: { CompileLogic, PrismEditor },
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

    generateNetwork(){
      // util.generateNetwork(this.verilogCode);

      let text = "(~a & ~b & c) | (~a & b & ~c)".replace(/\s/g, "");

      console.log("expression",util.convertBitwiseExprToJSON(text));
    },
    
    highlighter(code) {
      return highlight(code, languages.verilog); //returns html
    },
  },
  mounted() {
    this.verilogCode = window.localStorage.getItem("default");
    console.log(languages);
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