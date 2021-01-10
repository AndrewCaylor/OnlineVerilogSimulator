<template>
  <div class="main">
    <div>
      <button type="button" class="btn btn-secondary" v-on:click="compile()">
        Simulate!
      </button>
    </div>
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

import * as util from ".//generateNodeNetwork.ts";
import * as BitwiseLib from ".//bitwiseLib";
import { Evaluator } from ".//evaluate";

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
      return highlight(code, languages.verilog); //returns html
    },
    compile() {
      var d = new Date();
      var start = d.getTime();

      let net = util.getBaseModules(this.verilogCode);

      console.log(net);

      let elaborated = util.elaborateModuleDict(net);

      console.log(elaborated);

      // net = JSON.parse(JSON.stringify(net));

      // console.log(JSON.stringify(net["ssd"].callSyntax[1]));
      // console.log(net["ssd"].callSyntax[1]);
      // console.log(net)
      // let elaborated1 = util.elaborateModuleDict(net);
      // console.log(elaborated1);

      let evaluator = new Evaluator(elaborated);

      let opcode = BitwiseLib.binaryToBitArray("0100");
      let a = BitwiseLib.binaryToBitArray("00001010");
      let b = BitwiseLib.binaryToBitArray("00001001");

      let valArr = evaluator.evaluateModule(elaborated["arith"], [opcode, a, b]);

      console.log(valArr)

      var e = new Date();
      var end = e.getTime();
      console.log("time to compile: ", end - start); //approx 12ms
    },
  },
  mounted() {
    this.verilogCode = window.localStorage.getItem("default");
    this.compile();
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