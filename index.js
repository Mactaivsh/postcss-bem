const postcss = require('postcss')
const defaultConfig = {
  separators: {
    namespace: '-',
    descendent: '-',
    modifier: '--',
    state: '.is-'
  },
  defaultNamespace: undefined
}

const proccessAtComponent = (component, ns, config) => {
  let selector = component.params
  let last = component
  let parent = component.parent

  if (ns) {
    selector = `.${ns}${config.separators.namespace}${selector}`
  } else {
    selector = `.${selector}`
  }

  let newComponent = postcss.rule({
    selector,
    source: component.source,
    raws: { ...component.raws, semicolon: true }
  })

  component.each(rule => {
    let separator

    if (rule.type === 'decl') {
      newComponent.append(rule)
    } else if (rule.type === 'atrule') {
      if (rule.name === 'modifier') {
        separator = config.separators.modifier
        processAtModifier(component, rule, selector, separator, config)
      } else if (rule.name === 'descendent') {
        separator = config.separators.descendent
        processDescendent(component, rule, selector, separator, config)
      } else if (rule.name === 'when') {
        separator = config.separators.state
        processAtWhen(component, rule, selector, separator, config)
      }
    }
  })

  component.each(rule => {
    component.parent.insertAfter(last, rule)
    last = rule
  })

  parent.insertBefore(component, newComponent)
  parent.removeChild(component)
}

const processAtModifier = (component, modifier, parentSelector, separator, config) => {
  let selector = `${parentSelector}${separator}${modifier.params}`
  let newModifier = postcss.rule({
    selector,
    source: modifier.source,
    raws: modifier.raws
  })

  modifier.each(rule => {
    if (rule.type === 'decl') {
      newModifier.append(rule)
    } else if (rule.type === 'atrule' && rule.name === 'when') {
      processAtWhen(component, rule, selector, config.separators.state)
    }
  })

  component.append(newModifier)
  modifier.remove()
}

const processDescendent = (component, descendent, parentSelector, separator, config) => {
  let selector = `${parentSelector}${separator}${descendent.params}`
  let newDescendent = postcss.rule({
    selector,
    source: descendent.source,
    raws: descendent.raws
  })

  descendent.each(rule => {
    if (rule.type === 'decl') {
      newDescendent.append(rule)
    } else if (rule.type === 'atrule') {
      if (rule.name === 'when') {
        processAtWhen(component, rule, selector, config.separators.state)
      } else if (rule.name === 'modifier') {
        processAtModifier(component, rule, selector, config.separators.modifier)
      }
    }
  })

  component.append(newDescendent)
  descendent.remove()
}

const processAtWhen = (component, when, parentSelector, separator) => {
  let selector = `${parentSelector}${separator}${when.params}`
  let newWhen = postcss.rule({
    selector,
    source: when.source,
    raws: when.raws
  })

  newWhen.append(when.nodes)
  component.append(newWhen)
  when.remove()
}

module.exports = postcss.plugin('postcss-suit', function (opts) {
  opts = opts || {}
  const currentConfig = Object.assign({}, defaultConfig, opts)
  return (root, result) => {
    root.walkAtRules('utility', utility => {
      let parent = utility.parent
      if (!utility.params) {
        throw utility.error('No names supplied to @utility')
      }

      let utilityNames = postcss.list.comma(utility.params)

      let selector = utilityNames
        .map(params => {
          let name
          params = [params.split(' ')[0]]
          if (/.:(small|medium|large)$/.test(params)) {
            params = params.join('').split(':')
          }
          name = 'u-'

          if (params.length === 2) {
            let variant = params[1]
            if (variant === 'small') {
              name += 'sm-'
            } else if (variant === 'medium') {
              name += 'md-'
            } else if (variant === 'large') {
              name += 'lg-'
            } else {
              result.warn('Unknown variant: ' + variant, {
                node: utility
              })
            }
          }
          name += params[0]
          return '.' + name
        }).join(', ')

      let newUtility = postcss.rule({
        selector,
        source: utility.source,
        raws: utility.raws
      })

      utility.each(node => {
        newUtility.append(node.clone())
      })

      parent.insertBefore(utility, newUtility)
      parent.removeChild(utility)
    })

    root.walkAtRules('component-namespace', ns => {
      let name = ns.params
      let parent = ns.parent

      if (ns.nodes.length === 0) {
        return void ns.remove()
      }

      ns.walkAtRules('component', component => {
        proccessAtComponent(component, name, currentConfig)
      })

      ns.each(node => {
        parent.insertBefore(ns, node)
      })

      ns.remove()
    })

    root.walkAtRules('component', component => {
      let namespace = currentConfig.defaultNamespace
      proccessAtComponent(component, namespace, currentConfig)
    })
  }
})
