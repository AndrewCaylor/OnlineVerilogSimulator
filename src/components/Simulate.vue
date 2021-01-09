<template>
  <div id="Simulate">
    <div style="padding-bottom: 1em">
      <button type="button" class="btn btn-secondary" v-on:click="compile()">
        Simulate!
      </button>
    </div>
    module name select here some input boxes here some table here
  </div>
</template>

<script>
export default {
  name: "Simulate",
  components: {},
};
</script>

<style scoped lang="scss">
  @import "~bootstrap/scss/bootstrap.scss";
  @import "~bootstrap-vue/src/index.scss";
</style>
