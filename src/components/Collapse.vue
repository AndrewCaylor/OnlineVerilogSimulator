<template>
  <div id="Collapse">
    <div
      v-if="!isCollapsed"
      style="height: 100%; border-left: 1px solid white"
    ></div>
    <span>
      <i
        data-toggle="collapse"
        v-bind:data-target="'#collapseAll' + id"
        class="bi bi-chevron-right"
        v-bind:class="{ rotateDown: !isCollapsed }"
        v-on:click="isCollapsed = !isCollapsed"
      >
      </i>
      <div style="display: inline-block">
        <span style="font-weight: bold">{{ moduleData.name }}</span>
        {{ moduleData.instanceName }}
        <span v-if="!showInit && moduleData.parentInputs">
          (
          <i class="bi bi-arrow-down" style="color: #CCC"></i>
          {{ commaSeparated(moduleData.parentInputs) }}
          <i class="bi bi-arrow-up" style="color: #CCC"></i>
          {{ commaSeparated(moduleData.parentOutputs) }}
          )
        </span>
      </div>
    </span>

    <div
      class="collapse"
      v-bind:id="'collapseAll' + id"
      v-bind:class="{ show: showInit }"
    >
      <div class="card card-body">
        <!-- submodules -->
        <div v-if="showSubModules" class="leftMarginCat">
          <span>
            <i
              data-toggle="collapse"
              v-bind:data-target="'#collapseSubModules' + id"
              class="bi bi-chevron-right"
              v-bind:class="{ rotateDown: !isSubModulesCollapsed }"
              v-on:click="isSubModulesCollapsed = !isSubModulesCollapsed"
            >
            </i>
            <div style="display: inline-block; margin-bottom: 0.5rem">
              Sub-modules
            </div>
          </span>

          <div
            class="tabOver collapse leftMarginSub"
            v-bind:id="'collapseSubModules' + id"
            v-bind:class="{ show: showInit }"
          >
            <div
              v-for="submodule in moduleData.subModules"
              :key="submodule.instanceName"
              style="margin-bottom: 0.5rem"
            >
              <Collapse :moduleData="submodule" />
            </div>
          </div>
        </div>

        <!-- IOandWireValues -->

        <div v-if="showSubModules" class="leftMarginCat">
          <span>
            <i
              data-toggle="collapse"
              v-bind:data-target="'#collapseIO' + id"
              class="bi bi-chevron-right"
              v-bind:class="{ rotateDown: !isIOandWiresCollapsed }"
              v-on:click="isIOandWiresCollapsed = !isIOandWiresCollapsed"
            >
            </i>
            <div style="display: inline-block; margin-bottom: 0.5rem">
              IO and Wire Values
            </div>
          </span>

          <div
            class="tabOverFlex collapse"
            v-bind:id="'collapseIO' + id"
            v-bind:class="{ show: showInit }"
          >
            <div>
              <!-- will be in the same order as the right column, because of evaluate.ts -->
              <div v-for="input in moduleData.inputs" :key="input.name">
                <i class="bi bi-arrow-down-short"></i>
                {{ input.name }}
              </div>
              <div v-for="output in moduleData.outputs" :key="output.name">
                <i class="bi bi-arrow-up-short"></i>
                {{ output.name }}
              </div>
              <div v-for="wire in moduleData.wires" :key="wire.name">
                <i class="bi bi-arrow-up-short" style="opacity: 0"></i>
                {{ wire.name }}
              </div>
            </div>
            <div>
              <div
                v-for="parameterName in Object.keys(moduleData.IOandWireValues)"
                :key="parameterName"
              >
                {{
                  bitArrayToString(moduleData.IOandWireValues[parameterName], 2)
                }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="tabOverFlex">
          <div>
            <!-- will be in the same order as the right column, because of evaluate.ts -->
            <div v-for="input in moduleData.inputs" :key="input.name">
              <i class="bi bi-arrow-down-short"></i>
              {{ input.name }}
            </div>
            <div v-for="output in moduleData.outputs" :key="output.name">
              <i class="bi bi-arrow-up-short"></i>
              {{ output.name }}
            </div>
            <div v-for="wire in moduleData.wires" :key="wire.name">
              <i class="bi bi-arrow-up-short" style="opacity: 0"></i>
              {{ wire.name }}
            </div>
          </div>
          <div>
            <div
              v-for="parameterName in Object.keys(moduleData.IOandWireValues)"
              :key="parameterName"
            >
              {{
                bitArrayToString(moduleData.IOandWireValues[parameterName], 2)
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
let Self;
// let Document = document;
import * as BitwiseLib from ".//bitwiseLib";
// import * as Generate from ".//generateNodeNetwork";

export default {
  name: "Collapse",
  props: ["moduleData", "showInit"],
  components: {},
  methods: {
    onClickButton() {
      this.isCollapsed = !this.isCollapsed;
    },
    bitArrayToString(array, radix) {
      return BitwiseLib.bitArrayToString(array, radix);
    },
    refreshContent() {
      if (this.moduleData.subModules.length > 0) {
        this.showSubModules = true;
      }
    },
    commaSeparated(arr) {
      let out = arr.map((ele) => ele.name);
      return out.join(", ");
    },
  },
  watch: {
    moduleData: () => {
      if (Self) {
        //will run on mount before self is defined. also this does not refer to right this
        Self.refreshContent();
      }
    },
  },
  beforeMount() {
    this.id = this._uid;
    Self = this;
    this.refreshContent();
  },
  data() {
    return {
      isCollapsed: true,
      isSubModulesCollapsed: true,
      isIOandWiresCollapsed: true,
      showSubModules: false,
      id: null,
    };
  },
};
</script>

<style scoped lang="scss">
@import "~bootstrap/scss/bootstrap.scss";
@import "~bootstrap-vue/src/index.scss";

.card[data-v-d0f0b546] {
  background-color: transparent !important;
  border: none;
  padding: 0.5rem;
}

.bi-chevron-right {
  margin-right: 1rem;
  width: 1.1rem;
}
.bi-chevron-right:hover {
  color: white;
}

.commonWidth {
  width: 1rem !important;
}
.bi-arrow-down-short {
  @extend .commonWidth;
  transform: translate(-0.25rem, 0);
}
.bi-arrow-up-short {
  @extend .commonWidth;
  transform: translate(0.25rem, 0);
}

.card > span {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.leftMargin {
  margin-left: 2.25rem;
}
.leftMarginSub {
  margin-left: 2rem;
}
.leftMarginCat {
  margin-left: 1.5rem;
}

.invisible {
  opacity: 0;
}

.tabOverFlex {
  margin-top: 0.25rem;
  @extend .leftMargin;
  display: flex;
  flex-direction: row;
  > :first-child {
    margin-right: 1rem;
  }
}

.rotateDown {
  transform: rotate(90deg);
}

#Collapse {
  text-align: left;
  display: table;
}

span{
  white-space: nowrap;
}
</style>