<template>
  <div id="app">
    <h1>
      Very epic verilog compiler for Intro To Digital Systems
    </h1>
    <Editor />
  </div>
</template>

<script>
import Editor from "./components/Editor.vue";

export default {
  name: "App",
  components: {
    Editor,
  },
};
</script>

<style>

body {
  background-color: #121212 !important;
  color: white !important;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;

  height: 100%;
}
</style>
