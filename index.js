const postcss = require("postcss")
const defaultConfig = {
  separators: {
    namespace: "-",
    descendent: "-",
    modifier: "--",
    state: ".is-"
  }
}

const proccessAtComponent = (component, ns) => {
  let name = component.params
  let last = component
  let parent = component.parent

  if (ns) {
    name = `${ns}${defaultConfig.separators.namespace}${name}`
  }

  let newComponent = postcss.rule({
    selector: `.${name}`,
    source: component.source
  })

  component.each(rule => {
    let separator
    let newRule

    if (rule.type === 'atrule') {
      if (rule.name === 'modifier') {
        separator = defaultConfig.separators.modifier
      } else if (rule.name === 'descendent') {
        separator = defaultConfig.separators.descendent
      }

      if (separator) {
        newRule = postcss.rule({
          selector: `.${name}${separator}${rule.params}`,
          source: rule.source
        })

        rule.each(node => {
          newRule.append(node)
        })
        component.parent.insertAfter(last, newRule)
        last = newRule
        rule.remove()
      }

    } else if (rule.type === 'decl') {
      newComponent.append(rule)
    }
  })
  parent.insertBefore(component, newComponent)
  parent.removeChild(component)
}


module.exports = postcss.plugin("postcss-suit", function(opts) {
  opts = opts || {}

  let currentConfig = Object.assign(defaultConfig, opts)

  return function(root, result) {
    let namespaces = {}

    root.walkAtRules('utility', rule => {
      if (!rule.params) {
        throw rule.error("No names supplied to @utility")
      }

      let utilityNames = postcss.list.comma(rule.params)

      let selector = utilityNames
        .map(params => {
          let name
          params = params.split(':')
          name = "u-"

          if (params.length === 2) {
            let variant = params[1]
            if (variant === "small") {
              name += "sm-"
            } else if (variant === "medium") {
              name += "md-"
            } else if (variant === "large") {
              name += "lg-"
            } else {
              result.warn("Unknown variant: " + variant, {
                node: rule
              });
            }
          }
          name += params[0]
          return "." + name
        }).join(", ")

      let newUtility = postcss.rule({
        selector,
        source: rule.source
      })

      rule.each(function(node) {
        newUtility.append(node.clone())
      })

      root.insertBefore(rule, newUtility)
      root.removeChild(rule)
    })

    root.walkAtRules("component-namespace", ns => {
      let name = ns.params
      let parent = ns.parent

      if (ns.nodes.length === 0) {
        return void ns.remove()
      }

      ns.walkAtRules("component", component => {
        proccessAtComponent(component, name)
      })

      ns.each(node => {
        parent.insertBefore(ns, node)
      })

      ns.remove()
    })

    root.walkAtRules("component", function(component) {
      var namespace = opts.defaultNamespace;
      var id = component.source.input.file || component.source.input.id;
      if (id in namespaces) {
        namespace = namespaces[id];
      }

      processComponent(component, namespace);
    });

    root.walkAtRules("when", function(when) {
      var parent = when.parent;

      if (parent === root || parent.type !== "rule") {
        throw when.error(
          "@when can only be used in rules which are not the root node"
        );
      }

      var states = when.params;
      var newSelector = postcss.list
        .comma(parent.selector)
        .map(function(selector) {
          return postcss.list
            .comma(states)
            .map(function(state) {
              return selector + currentConfig.separators.state + state;
            })
            .join(", ");
        })
        .join(", ");

      var newWhen = postcss.rule({
        selector: newSelector,
        source: when.source
      });

      when.each(function(node) {
        node.moveTo(newWhen);
      });
      newWhen.moveAfter(parent);
      when.removeSelf();
    });
  };
});
