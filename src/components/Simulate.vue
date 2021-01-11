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
                  v-model="savedInputs[selectedModule][input.name]"
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

        <div style="text-align: center; border-top: 1px solid #999; margin-top: 1rem; padding-top: 1rem">
          <button
            type="button"
            data-toggle="dropdown"
            class="btn btn-outline-secondary btn-lg"
            style="margin: auto"
          >
            Simulate!
          </button>
        </div>
      </div>
    </div>
    <div style="width: 70%">
      <div class="obj">stuff and things</div>
    </div>
  </div>
</template>

<script>
import { compileVerilog } from ".//generateNodeNetwork.ts";
// import { parse } from "./generateNodeNetwork";
// import * as BitwiseLib from ".//bitwiseLib";
// import { Evaluator } from ".//evaluate";

export default {
  name: "Simulate",
  components: {},
  data() {
    return {
      modules: {},
      selectedModule: null,
      savedInputs: {},
      savedTypes: {},
    };
  },
  mounted() {
    let text = window.localStorage.getItem("default");
    let types = window.localStorage.getItem("types");
    let inputs = window.localStorage.getItem("inputs");
    this.modules = compileVerilog(text);

    this.selectedModule = Object.keys(this.modules)[0];

    if (!types || !inputs) {
      types = {};
      inputs = {};
      Object.keys(this.modules).forEach((Module) => {
        types[this.modules[Module].name] = {};
        inputs[this.modules[Module].name] = {};
        this.modules[Module].inputs.forEach((input) => {
          types[this.modules[Module].name][input.name] = "bin";
          inputs[this.modules[Module].name][input.name] = "";
        });
      });
    }

    this.savedTypes = types;
    this.savedInputs = inputs;
  },
  methods: {
    setSelectedModule(input) {
      this.selectedModule = input;
    },
    setSelectedType(input, name) {
      this.savedTypes[this.selectedModule][name] = input;
      this.savedInputs[this.selectedModule][name] = "";
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
  },
};
</script>

<style scoped lang="scss">
.redBackground {
  background-color: #200000 !important;
}

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

.myText {
  color: #ccc;
  font-family: "Courier New", Courier, monospace;
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
  font-family: "Courier New", Courier, monospace !important;
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
  top: 5rem;
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
  min-width: 300px;
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
