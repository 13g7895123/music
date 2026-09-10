import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const mountWith = (provideValue) =>
  mount(ThemeToggle, { global: { provide: { theme: provideValue } } })

describe('ThemeToggle', () => {
  it('三個主題都列出來，目前主題標成 active', () => {
    const wrapper = mountWith({ theme: ref('v3'), setTheme: vi.fn() })
    const buttons = wrapper.findAll('.theme-option')
    expect(buttons.length).toBe(3)
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[0].attributes('aria-checked')).toBe('true')
    expect(buttons[1].attributes('aria-checked')).toBe('false')
  })

  it('點下去會用對應的主題代號呼叫 setTheme', async () => {
    const setTheme = vi.fn()
    const wrapper = mountWith({ theme: ref('v3'), setTheme })

    await wrapper.findAll('.theme-option')[1].trigger('click')
    expect(setTheme).toHaveBeenCalledWith('v2')

    await wrapper.findAll('.theme-option')[2].trigger('click')
    expect(setTheme).toHaveBeenCalledWith('v1')
  })

  it('目前是 v2 時標記在深色那顆', () => {
    const wrapper = mountWith({ theme: ref('v2'), setTheme: vi.fn() })
    expect(wrapper.findAll('.theme-option')[1].classes()).toContain('active')
  })

  it('沒有 provide 也不會壞掉', () => {
    const wrapper = mount(ThemeToggle)
    expect(wrapper.findAll('.theme-option').length).toBe(3)
    expect(() => wrapper.findAll('.theme-option')[0].trigger('click')).not.toThrow()
  })
})
