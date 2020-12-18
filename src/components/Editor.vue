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

import * as util from ".//hello";

// class IO{
//   constructor
// }
/*
regex for checking statement syntax:

assign: /assign\s+\w+\s+=.+/
ex: assign asdf = ????

module usage: /\w+\s+\w+\((\s*\w+)(,\s*\w+)*\)/
ex: abc asdf( 1, 3, 56r)

(swap out wire for input to )
wire declaration: /wire\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+$)/
ex: 
wire [1:3] asdf, a
wire asdfa


*/

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
      util.generateNetwork(this.verilogCode);
    },
    
    // elaborateModuleObj(text, thisModule) {
    //   let expressions = text.split(";");

    //   //for each expression find the modules/assign statements
    //   for (let i = 1; i < expressions.length; i++) {
    //     let temp = expressions[i];

    //     if ((temp.match(/assign/g) || []).length == 1) {
    //       //TODO
    //     } else {
    //       //if not an assign statement
    //       //might delete these lines earlier to simplify things
    //       if (temp.match(/wire|input|output/g).length == 0) {
    //         let matched = false;

    //         this.globalModules.forEach((globalModule) => {
    //           if ((temp.match(globalModule.name) || []).length == 1) {
    //           }
    //         });
    //       }
    //     }
    //   }
    // },
    
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