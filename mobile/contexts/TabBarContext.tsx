import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type TabName = '(feed)' | '(discover)' | 'create-post' | '(match)' | '(profile)'

interface TabBarContextType {
  isSearchMode: boolean
  previousTab: TabName
  activeTab: TabName
  setSearchMode: (isSearch: boolean, fromTab?: TabName) => void
  setActiveTab: (tab: TabName) => void
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined)

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [previousTab, setPreviousTab] = useState<TabName>('(feed)')
  const [activeTab, setActiveTab] = useState<TabName>('(feed)')

  const setSearchMode = useCallback((isSearch: boolean, fromTab?: TabName) => {
    if (isSearch && fromTab) {
      setPreviousTab(fromTab)
    }
    setIsSearchMode(isSearch)
  }, [])

  return (
    <TabBarContext.Provider
      value={{
        isSearchMode,
        previousTab,
        activeTab,
        setSearchMode,
        setActiveTab,
      }}
    >
      {children}
    </TabBarContext.Provider>
  )
}

export function useTabBar() {
  const context = useContext(TabBarContext)
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider')
  }
  return context
}
