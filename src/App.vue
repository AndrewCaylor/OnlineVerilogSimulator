<template>
  <div id="app">
    <div class="myNav">
      <div class="subNav">
        <div style="text-align: left">
          <h2 style="margin-bottom: -10px; font-weight: bold">
            <span> Andrew's Verilog Sim </span>

            <span style="font-size: x-large">
              <a
                href="https://github.com/AndrewCaylor/OnlineVerilogSimulator"
                target="_blank"
                style="margin-right: 1rem"
              >
                <i class="bi bi-github"></i
              ></a>

              <a
                href=" https://www.linkedin.com/in/andrew-caylor-377a03198 "
                target="_blank"
              >
                <i class="bi bi-linkedin"></i
              ></a>
            </span>
          </h2>
          <sub style="color: ">Written in Javascript for some reason??</sub>
        </div>
      </div>

      <div class="subNav">
        <div>
          <button
            type="button"
            v-bind:class="{ disabled: !showEditor | isError }"
            class="btn btn-outline-secondary"
            v-on:click="toggle()"
          >
            {{ leftContent }}
          </button>
        </div>

        <div>
          <button
            type="button"
            v-bind:class="{ disabled: showEditor }"
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

    <div v-bind:class="{ hidden: !showEditor }">
      <Editor @isCompileError="onUpdate" />
    </div>
    <div v-bind:class="{ hidden: showEditor }">
      <Simulate :isVisible="!showEditor" />
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
      if (this.showEditor) {
        this.leftContent = "simulating...";
        this.rightContent = "Edit";
      } else {
        this.leftContent = "Simulate";
        this.rightContent = "editing...";
      }
      this.showEditor = !this.showEditor;
    },
    onUpdate(input) {
      this.isError = input;
    },
  },
  data() {
    return {
      leftContent: "Simulate",
      rightContent: "editing...",
      showEditor: true,
      isError: false,
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
  font-family: Consolas;
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
  font-family: Consolas !important;
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
  font-family: Consolas;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;

  height: 100%;
}

.hidden {
  //hide and remove from dom flow
  visibility: hidden;
  position: fixed;
  //put at back just incase
  z-index: 0;
}
</style>
