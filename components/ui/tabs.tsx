"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string
  scopeId: string
  onValueChange: (value: string) => void
} | null>(null)

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
  }
>(({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
  const [stateValue, setStateValue] = React.useState(value || defaultValue || "")
  const scopeId = React.useId()

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (value === undefined) setStateValue(newValue)
      onValueChange?.(newValue)
    },
    [onValueChange, value]
  )

  return (
    <TabsContext.Provider value={{ value: value ?? stateValue, scopeId, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onKeyDown, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    onKeyDown={event => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const vertical = event.currentTarget.getAttribute("aria-orientation") === "vertical"
      const nextKey = vertical ? "ArrowDown" : "ArrowRight"
      const previousKey = vertical ? "ArrowUp" : "ArrowLeft"
      if (![nextKey, previousKey, "Home", "End"].includes(event.key)) return
      const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
      const current = tabs.indexOf(event.target as HTMLButtonElement)
      if (current < 0) return
      event.preventDefault()
      const rtl = !vertical && getComputedStyle(event.currentTarget).direction === "rtl"
      const direction = (event.key === nextKey ? 1 : -1) * (rtl ? -1 : 1)
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(current + direction + tabs.length) % tabs.length]
      next?.focus()
      next?.click()
    }}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, onClick, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")

  const isActive = context.value === value

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`${context.scopeId}-tab-${encodeURIComponent(value)}`}
      aria-selected={isActive}
      aria-controls={`${context.scopeId}-panel-${encodeURIComponent(value)}`}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-[color,background-color,border-color,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow",
        className
      )}
      onClick={(e) => {
        context.onValueChange(value)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")

  const isActive = context.value === value

  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`${context.scopeId}-panel-${encodeURIComponent(value)}`}
      aria-labelledby={`${context.scopeId}-tab-${encodeURIComponent(value)}`}
      tabIndex={0}
      hidden={!isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isActive && "hidden",
        isActive && "erp-panel-enter",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
