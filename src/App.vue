<template>
  <div id="app">
    <div class="myNav">
      <div class="subNav">
        <div style="text-align: left">
          <h2 style="margin-bottom: -10px; font-weight: bold">
            Andrew's Verilog Sim
          </h2>
          <sub>Done in Javascript because I am a masochist</sub>
        </div>
      </div>

      <div>
        <a
          href="https://github.com/AndrewCaylor/OnlineVerilogSimulator"
          target="_blank"
        >
          <i class="bi bi-github"></i
        ></a>
      </div>

      <div class="subNav">
        <div>
          <button
            type="button"
            v-bind:class="{ disabled: !toggleState }"
            class="btn btn-outline-secondary"
            v-on:click="toggle()"
          >
            {{ leftContent }}
          </button>
        </div>

        <div>
          <button
            type="button"
            v-bind:class="{ disabled: toggleState }"
            class="btn btn-outline-secondary"
            v-on:click="toggle()"
          >
            {{ rightContent }}
          </button>
        </div>
      </div>
    </div>
    <!-- fills in for position fixed nav -->
    <div style="height: 5rem"></div>

    <div v-if="toggleState">
      <Editor />
    </div>
    <div v-else>
      <Simulate />
    </div>
  </div>
</template>

<script>
import Editor from "./components/Editor.vue";
import Simulate from "./components/Simulate.vue";

// import Slider from "./components/Slider.vue";

const Console = console;

export default {
  name: "App",
  components: {
    Editor,
    Simulate,
  },
  methods: {
    onClickChild(val) {
      Console.log(val);
    },
    toggle() {
      if (this.toggleState) {
        this.leftContent = "simulating...";
        this.rightContent = "Edit";
      } else {
        this.leftContent = "Simulate";
        this.rightContent = "editing...";
      }
      this.toggleState = !this.toggleState;
    },
  },
  data() {
    return {
      leftContent: "Simulate",
      rightContent: "editing...",
      toggleState: true,
    };
  },
};
</script>

<style lang="scss" scoped>
@import "~bootstrap/scss/bootstrap.scss";

.bi:hover {
  color: white;
}
button {
  font-family: Arial, Helvetica, sans-serif;
}
</style>

<style lang="scss">
.bi {
  color: #999;
  transition: all 0.15s;
  display: inline-block;
}

sub {
  color: #999;
  font-size: small !important;
}

.myNav {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-family: "Courier New", Courier, monospace;
  align-items: center;
  background-color: #16161c;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-bottom: 1px solid #999;
  position: fixed;
  width: 100%;
  z-index: 999;
  // float: right;
}

.myNav + {
  margin-top: 100rem;
}

.subNav {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
}

.subNav * {
  margin-right: 1em;
}

.btn-outline-secondary {
  background-color: #16161c !important;
  color: #ccc !important;
}
.btn-outline-secondary:hover {
  background-color: #121212 !important;
  color: white !important;
}
.btn-outline-secondary:focus {
  background-color: #121212 !important;
  box-shadow: none !important;
}
.btn-outline-secondary:active {
  background-color: #121212 !important;
  box-shadow: none !important;
}
body {
  background-color: #121212 !important;
  color: white !important;
}

.disabled {
  // color: white !important;
  // opacity: 1 !important;
  // border-color: #303030 !important;
  pointer-events: none;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;

  height: 100%;
}
</style>
