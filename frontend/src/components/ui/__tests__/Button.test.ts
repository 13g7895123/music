import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button Component', () => {
  it('渲染基本按鈕', () => {
    const wrapper = mount(Button, {
      props: {
        text: '點擊我'
      }
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('點擊我')
  })

  it('應用不同的變體樣式', () => {
    const variants = ['primary', 'secondary', 'success', 'danger', 'warning']

    variants.forEach(variant => {
      const wrapper = mount(Button, {
        props: {
          text: 'Test',
          variant
        }
      })

      expect(wrapper.find('button').classes()).toContain(`btn-${variant}`)
    })
  })

  it('應用不同的尺寸', () => {
    const sizes = ['small', 'medium', 'large']

    sizes.forEach(size => {
      const wrapper = mount(Button, {
        props: {
          text: 'Test',
          size
        }
      })

      expect(wrapper.find('button').classes()).toContain(`btn-${size}`)
    })
  })

  it('禁用狀態', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Disabled Button',
        disabled: true
      }
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('disabled')
  })

  it('載入狀態', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Loading Button',
        loading: true
      }
    })

    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('處理點擊事件', async () => {
    const clickHandler = vi.fn()
    const wrapper = mount(Button, {
      props: {
        text: 'Click Me'
      },
      listeners: {
        click: clickHandler
      }
    })

    await wrapper.find('button').trigger('click')
    expect(clickHandler).toHaveBeenCalledOnce()
  })

  it('禁用時不觸發點擊事件', async () => {
    const clickHandler = vi.fn()
    const wrapper = mount(Button, {
      props: {
        text: 'Disabled Button',
        disabled: true
      },
      listeners: {
        click: clickHandler
      }
    })

    await wrapper.find('button').trigger('click')
    expect(clickHandler).not.toHaveBeenCalled()
  })

  it('載入時不觸發點擊事件', async () => {
    const clickHandler = vi.fn()
    const wrapper = mount(Button, {
      props: {
        text: 'Loading Button',
        loading: true
      },
      listeners: {
        click: clickHandler
      }
    })

    await wrapper.find('button').trigger('click')
    expect(clickHandler).not.toHaveBeenCalled()
  })

  it('支援圖示', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Icon Button',
        icon: 'play'
      }
    })

    expect(wrapper.find('.icon').exists()).toBe(true)
    expect(wrapper.find('.icon').classes()).toContain('icon-play')
  })

  it('支援僅圖示按鈕', () => {
    const wrapper = mount(Button, {
      props: {
        icon: 'close',
        iconOnly: true,
        'aria-label': 'Close'
      }
    })

    expect(wrapper.find('.icon').exists()).toBe(true)
    expect(wrapper.find('button').classes()).toContain('icon-only')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Close')
  })

  it('支援外部連結', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'External Link',
        href: 'https://example.com',
        target: '_blank'
      }
    })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('支援內部路由', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Internal Link',
        to: '/dashboard'
      },
      global: {
        stubs: ['RouterLink']
      }
    })

    const routerLink = wrapper.findComponent({ name: 'RouterLink' })
    expect(routerLink.exists()).toBe(true)
    expect(routerLink.props('to')).toBe('/dashboard')
  })

  it('支援鍵盤操作', async () => {
    const clickHandler = vi.fn()
    const wrapper = mount(Button, {
      props: {
        text: 'Keyboard Button'
      },
      listeners: {
        click: clickHandler
      }
    })

    const button = wrapper.find('button')

    // 測試 Enter 鍵
    await button.trigger('keydown.enter')
    expect(clickHandler).toHaveBeenCalled()

    clickHandler.mockClear()

    // 測試 Space 鍵
    await button.trigger('keydown.space')
    expect(clickHandler).toHaveBeenCalled()
  })

  it('支援自定義CSS類別', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Custom Button',
        class: 'custom-class another-class'
      }
    })

    const button = wrapper.find('button')
    expect(button.classes()).toContain('custom-class')
    expect(button.classes()).toContain('another-class')
  })

  it('支援插槽內容', () => {
    const wrapper = mount(Button, {
      slots: {
        default: '<span class="custom-content">自定義內容</span>'
      }
    })

    expect(wrapper.find('.custom-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('自定義內容')
  })

  it('支援前置和後置圖示插槽', () => {
    const wrapper = mount(Button, {
      props: {
        text: 'Button with Icons'
      },
      slots: {
        'icon-before': '<span class="before-icon">👈</span>',
        'icon-after': '<span class="after-icon">👉</span>'
      }
    })

    expect(wrapper.find('.before-icon').exists()).toBe(true)
    expect(wrapper.find('.after-icon').exists()).toBe(true)
  })

  it('響應式行為', async () => {
    // 模擬視窗大小變化
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    })

    const wrapper = mount(Button, {
      props: {
        text: 'Responsive Button',
        responsive: true
      }
    })

    expect(wrapper.find('button').classes()).toContain('responsive')

    // 模擬較小螢幕
    Object.defineProperty(window, 'innerWidth', {
      value: 480
    })

    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    // 在小螢幕上可能會有不同的樣式
    expect(wrapper.vm.isMobile).toBe(true)
  })
})