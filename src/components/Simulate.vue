<template>
  <div id="Simulate">
    <!-- <div style="padding-bottom: 1em">
      <button type="button" class="btn btn-secondary" v-on:click="compile()">
        Simulate!
      </button>
    </div> -->
    <div>
      <div class="settings">
        <h4>Simulation Settings</h4>
        <div
          class="myText"
          style="text-align: center; font-size: large; padding-top: 1rem"
        >
          Base Module
        </div>
        <div class="dropdown" style="text-align: center; margin-bottom: 1rem">
          <button
            type="button"
            data-toggle="dropdown"
            class="btn btn-outline-secondary dropdown-toggle"
          >
            {{ selectedModule || "No Module Selected" }}
          </button>
          <div class="dropdown-menu">
            <a
              v-for="item in modules"
              :key="item.name"
              class="dropdown-item-real"
              v-on:click="setSelectedModule(item.name)"
            >
              {{ item.name }}
            </a>
          </div>
        </div>

        <div
          class="myText"
          style="text-align: center; font-size: large; padding: 1rem"
        >
          Module Inputs
        </div>

        <div v-if="selectedModule">
          <div class="myContainer">
            <div class="subContainer" style="margin-right: 1rem">
              <div
                v-for="input in modules[selectedModule].inputs"
                :key="input.name"
                style="line-height: 2rem"
              >
                {{ input.name }}
              </div>
            </div>

            <div class="subContainer">
              <div
                v-for="input in modules[selectedModule].inputs"
                :key="input.name"
                class="myFlex dropright"
              >
                <input
                  type="text"
                  @keypress="validateText($event, input.name)"
                  v-on:keyup="setLocalStorage()"
                  v-model="savedInputs[selectedModule][input.name]"
                  v-bind:class="{
                    darkRedBackground: !inputIsComplete(input.name),
                  }"
                />
                <!-- <i class="bi bi-gear-fill" data-toggle="dropdown"></i> -->
                <button
                  class="btn btn-outline-secondary btn-sm dropdown-toggle"
                  type="button"
                  data-toggle="dropdown"
                  style="margin-left: 0.5rem"
                >
                  {{ savedTypes[selectedModule][input.name] || "asfd" }}
                </button>
                <div
                  class="dropdown-menu"
                  style="width: 4.5rem; min-width: 4.5rem"
                >
                  <a
                    class="dropdown-item-real"
                    v-on:click="setSelectedType('bin', input.name)"
                    >bin</a
                  >
                  <a
                    class="dropdown-item-real"
                    v-on:click="setSelectedType('hex', input.name)"
                    >hex</a
                  >
                  <a
                    class="dropdown-item-real"
                    v-on:click="setSelectedType('dec', input.name)"
                    >dec</a
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style="
            text-align: center;
            border-top: 1px solid #999;
            margin-top: 1rem;
            padding-top: 1rem;
          "
        >
          <button
            type="button"
            class="btn btn-outline-secondary btn-lg"
            style="margin: auto"
            v-on:click="compile()"
          >
            Simulate!
          </button>
        </div>
      </div>
    </div>
    <div style="width: 100%">
      <div class="obj" v-if="evaluatedModule">
        <Collapse :moduleData="evaluatedModule" :showInit="true" />
      </div>
    </div>
  </div>
</template>

<script>
import { compileVerilog } from ".//generateNodeNetwork.ts";
import Collapse from ".//Collapse.vue";
// import { parse } from "./generateNodeNetwork";
import * as BitwiseLib from ".//bitwiseLib";
import { Evaluator } from ".//evaluate";
let Console = console;
// let Self;

let Self;

export default {
  name: "Simulate",
  components: { Collapse },
  props: { isVisible: null },
  data() {
    Collapse;
    return {
      modules: {},
      selectedModule: null,
      savedInputs: {},
      savedTypes: {},
      evaluatedModule: null,
    };
  },
  beforeMount() {
    this.initializeAndCorrect();
    Self = this;
  },
  watch: {
    isVisible: () => {
      //refresh every time it becomes visible agiain
      if (Self) {
        //will run on mount before self is defined. also this does not refer to right this
        Self.initializeAndCorrect();
      }
    },
  },
  methods: {
    initializeAndCorrect() {
      let text = window.localStorage.getItem("default");
      let types = window.localStorage.getItem("types");
      let inputs = window.localStorage.getItem("inputs");
      let selectedModule = window.localStorage.getItem("selectedModuleName");
      this.modules = compileVerilog(text).data;
  
      let selectedModuleFound = Object.keys(this.modules).find(
        (name) => selectedModule == name
      );

      if (!selectedModuleFound) {
        this.selectedModule = Object.keys(this.modules)[0];
        this.setLocalStorage();
      } else {
        this.selectedModule = selectedModule;
      }

      if (!types || !inputs) {
        //create starting point
        this.savedTypes = {};
        this.savedInputs = {};
      } else {
        this.savedTypes = JSON.parse(types);
        this.savedInputs = JSON.parse(inputs);
      }
      //detect any missing types
      Object.keys(this.modules).forEach((Module) => {
        if (!this.savedTypes[Module]) {
          this.savedTypes[Module] = {};
        }
        this.modules[Module].inputs.forEach((input) => {
          if (
            this.savedTypes[this.modules[Module].name][input.name] === undefined
          ) {
            this.savedTypes[this.modules[Module].name][input.name] = "bin";
          }
        });
      });
      //detect any missing inputs
      Object.keys(this.modules).forEach((Module) => {
        if (!this.savedInputs[Module]) {
          this.savedInputs[Module] = {};
        }
        this.modules[Module].inputs.forEach((input) => {
          if (
            this.savedInputs[this.modules[Module].name][input.name] ===
            undefined
          ) {
            this.savedInputs[this.modules[Module].name][input.name] = "";
          }
        });
      });

      //detect any extra inputs
      Object.keys(this.savedInputs).forEach((Module) => {
        if(this.modules[Module] === undefined){
          delete this.savedInputs[Module];
        }

        //looping through savedtypes and savedinputs
        Object.keys(this.savedInputs[Module]).forEach((input) => {
          const foundInput = this.modules[Module].inputs.find(
            (param) => param.name == input
          );

          if (foundInput == null || foundInput == undefined) {
            delete this.savedInputs[this.modules[Module].name][input];
          }
        });
        Object.keys(this.savedTypes[Module]).forEach((type) => {
          const foundType = this.modules[Module].inputs.find(
            (param) => param.name == type
          );

          if (foundType == null || foundType == undefined) {
            delete this.savedTypes[this.modules[Module].name][type];
          }
        });
      });

      this.setLocalStorage();
    },
    setSelectedModule(input) {
      this.selectedModule = input;
      this.setLocalStorage();
      this.initializeAndCorrect();
    },
    setLocalStorage() {
      window.localStorage.setItem("selectedModuleName", this.selectedModule);
      window.localStorage.setItem("types", JSON.stringify(this.savedTypes));
      window.localStorage.setItem("inputs", JSON.stringify(this.savedInputs));
    },
    setSelectedType(input, name) {
      this.savedTypes[this.selectedModule][name] = input;
      this.savedInputs[this.selectedModule][name] = "";
      this.setLocalStorage();
    },
    compile() {
      var d = new Date();
      var start = d.getTime();

      let evaluator = new Evaluator(this.modules);

      let inputArr = [];
      Object.keys(this.savedInputs[this.selectedModule]).forEach((ele) => {
        const text = this.savedInputs[this.selectedModule][ele];
        const inputType = this.savedTypes[this.selectedModule][ele];
        const parameter = this.modules[this.selectedModule].inputs.find(
          (param) => param.name == ele
        );

        let binText;
        switch (inputType) {
          case "bin":
            binText = text;
            break;
          case "hex":
            binText = parseInt(text, 16).toString(2);
            break;
          case "dec":
            binText = parseInt(text, 10).toString(2);
            break;
        }
        let boolArr = BitwiseLib.binaryToBitArray(binText);
        while (boolArr.length < parameter.endBit - parameter.beginBit + 1)
          boolArr.push(false);
        inputArr.push(boolArr);
      });
      this.evaluatedModule = evaluator.evaluate(
        this.selectedModule,
        inputArr
      ).data;

      console.log(this.evaluatedModule);

      var e = new Date();
      var end = e.getTime();
      Console.log("time to compile: ", end - start); //approx 2-30ms

      this.setLocalStorage();
    },
    validateText(event, parameterName) {
      let type = this.savedTypes[this.selectedModule][parameterName];
      let goodInput = null;
      switch (type) {
        case "hex":
          goodInput = event.key.match(/[0-9A-Fa-f]/);
          break;
        case "dec":
          goodInput = event.key.match(/[0-9]/);
          break;
        case "bin":
        default:
          goodInput = event.key.match(/[0-1]/);
      }

      if (goodInput === null) {
        event.preventDefault();
        return;
      }

      let parameterSyntax = this.modules[this.selectedModule].inputs.find(
        (input) => input.name == parameterName
      );

      let bitLength = parameterSyntax.endBit - parameterSyntax.beginBit + 1;
      let currentText = this.savedInputs[this.selectedModule][parameterName];
      let textLength = currentText.length;

      if (type == "hex") textLength *= 4;
      if (textLength >= bitLength) {
        event.preventDefault();
      }
      if (type == "dec") {
        let val = parseInt(currentText + event.key);
        if (val >= Math.pow(2, bitLength)) {
          event.preventDefault();
        }
      }
    },
    //similar to above but simpler
    inputIsComplete(parameterName) {
      let type = this.savedTypes[this.selectedModule][parameterName];
      //dont worry about dec numbers
      if (type == "dec") {
        return true;
      }
      let parameterSyntax = this.modules[this.selectedModule].inputs.find(
        (input) => input.name == parameterName
      );

      let bitLength = parameterSyntax.endBit - parameterSyntax.beginBit + 1;
      let currentText = this.savedInputs[this.selectedModule][parameterName];
      let textLength = currentText.length;
      if (type == "hex") textLength *= 4;
      return textLength >= bitLength;
    },
  },
};
</script>

<style scoped lang="scss">
.myContainer {
  display: flex;
  @extend .myText;
  text-align: left;
  color: #ccc;
  .subContainer {
    div {
      margin-bottom: 0.5rem;
      height: 2rem;
      * {
        height: auto;
      }
    }
  }
}

.darkRedBackground {
  background-color: #300000 !important;
}

.myText {
  color: #ccc;
  font-family: Consolas, monospace;
}

.myFlex {
  display: flex;
  flex-direction: row;
}

input {
  border: 1px solid #6c757d;
  color: #ccc;

  border-radius: 0.25rem;
  background-color: #121212;
  margin-bottom: 1rem;
  font-family: monospace !important;
}
input:focus {
  outline: none;
}
.dropdown-item-real {
  display: block;
  margin: 0.25rem;
  padding-left: 1rem;
  padding-bottom: 0.25rem;
  text-align: left;
}

.dropdown-item-real:hover {
  text-decoration: none;
  cursor: pointer;
}

#Simulate {
  display: flex;
  flex-direction: row;
  padding: 1rem;
}

.settings {
  min-width: inherit;
  max-width: inherit;
  width: inherit;
  height: 80vh;
  position: sticky;
  top: 6rem;
  padding-left: 2rem;
  padding-right: 2rem;
  // font-weight: 300;
  @extend .box;
  @extend .myText;
  text-align: left;
  .dropdown {
    margin-top: 1rem;
  }
  h4 {
    text-align: center;
    color: white;
    margin-top: 1rem;
    border-bottom: 1px solid #6c757d;
  }
}

.obj {
  @extend .box;
  @extend .myText;
  min-width: 300px;
  padding: 1rem;
  margin-left: 3rem;
}

.box {
  border: 1px solid #6c757d;
  border-radius: 0.25rem;
  background-color: #16161c;
}

.dropdown-menu[data-v-1edb7054] {
  background-color: #121212 !important;
  border: 1px solid #6c757d;
  [data-v-1edb7054] {
    color: #999;
    background-color: #121212 !important;
    transition: color 0.15s;
  }
  [data-v-1edb7054]:hover {
    color: white !important;
  }
}

@import "~bootstrap/scss/bootstrap.scss";
@import "~bootstrap-vue/src/index.scss";
</style>
