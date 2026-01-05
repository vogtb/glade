import { BookOpen, ChevronRight, Code, FileText, GraduationCap, Rocket, X } from "lucide-react";
import { useState } from "react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenSection(null);
  };

  return (
    <>
      <header className="fixed z-9999 flex w-full items-center justify-center">
        <div className="mt-4 flex w-11/12 gap-6 rounded-2xl border border-solid border-gray-700 bg-gray-800 p-1 shadow-xl md:w-fit">
          <div className="flex h-9 w-full items-center justify-between gap-0 md:justify-start">
            <a href="/" className="mr-2 flex h-9 items-center gap-2">
              <div className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 pt-0 pr-3.5 pb-0 pl-3 py-0">
                <span className="leading-6.5 text-white text-[32px]">⚘</span>
                <span className="font-medium text-white">Glade</span>
              </div>
            </a>

            <div className="flex h-full w-fit items-center gap-x-2 md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-700/80"
                aria-label="Open menu"
              >
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <path
                    fill="transparent"
                    strokeWidth="2"
                    stroke="white"
                    strokeLinecap="square"
                    d="M 2 2.5 L 20 2.5"
                  />
                  <path
                    fill="transparent"
                    strokeWidth="2"
                    stroke="white"
                    strokeLinecap="square"
                    d="M 2 9.423 L 20 9.423"
                  />
                  <path
                    fill="transparent"
                    strokeWidth="2"
                    stroke="white"
                    strokeLinecap="square"
                    d="M 2 16.346 L 20 16.346"
                  />
                </svg>
              </button>
            </div>

            <div className="hidden md:inline">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent text-white hover:bg-gray-700/80 hover:text-white focus:bg-gray-700/80 focus:text-white data-[state=open]:bg-gray-700/80 data-[state=open]:text-white data-[state=open]:hover:bg-gray-700/80 data-[state=open]:hover:text-white data-[state=open]:focus:bg-gray-700/80 data-[state=open]:focus:text-white">
                      Docs
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="bg-gray-800 border-gray-700">
                      <ul className="w-70 p-1">
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#readme"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                                <FileText className="h-5 w-5 text-purple-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">README.md</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Project overview
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#getting-started"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                                <Rocket className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">Start Here</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Quick start guide
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#core-concepts"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                                <GraduationCap className="h-5 w-5 text-purple-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">Core Concepts</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Learn the fundamentals
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#app"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                                <FileText className="h-5 w-5 text-green-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">App</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Application structure
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#components"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                                <Code className="h-5 w-5 text-purple-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">Components</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  UI elements and layouts
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#demos"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500/20">
                                <Rocket className="h-5 w-5 text-pink-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">Demos</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Interactive examples
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="#faq"
                              className="flex flex-row items-start gap-3 select-none rounded-md p-2 no-underline outline-none transition-colors hover:bg-gray-700/80"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                                <BookOpen className="h-5 w-5 text-green-400" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-white">FAQ</div>
                                <p className="text-xs leading-relaxed text-gray-400">
                                  Common questions
                                </p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a
                        href="https://github.com/vogtb/glade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-white transition-colors hover:bg-gray-700/80 hover:text-white focus:bg-gray-700/80 focus:text-white focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                      >
                        Github ↗
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-10000 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobileMenu} />

          <div className="absolute left-0 right-0 top-4 mx-auto w-11/12 rounded-2xl border border-solid border-gray-700 bg-gray-800 shadow-xl">
            <div className="flex w-full items-center justify-between p-1">
              <a href="/" className="mr-2 flex h-9 items-center gap-2">
                <div className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3">
                  <span className="leading-6.5 text-white text-[32px]">⚘</span>
                  <span className="font-medium text-white">Glade</span>
                </div>
              </a>
              <button
                onClick={closeMobileMenu}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-700/80"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex flex-col gap-1 p-2">
              <div className="flex flex-col rounded-2xl bg-gray-700/50">
                <button
                  onClick={() => toggleSection("docs")}
                  className="flex items-center justify-between p-4 text-white hover:bg-gray-700/80 rounded-2xl transition-colors"
                >
                  <span className="">Docs</span>
                  <ChevronRight
                    className={`h-5 w-5 transition-transform ${openSection === "docs" ? "rotate-90" : ""}`}
                  />
                </button>
                {openSection === "docs" && (
                  <div className="flex flex-col gap-1 px-2 pb-2">
                    <a
                      href="#readme"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                        <FileText className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">README.md</div>
                        <p className="text-sm text-gray-400">Project overview</p>
                      </div>
                    </a>
                    <a
                      href="#getting-started"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                        <Rocket className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">Start Here</div>
                        <p className="text-sm text-gray-400">Quick start guide</p>
                      </div>
                    </a>
                    <a
                      href="#core-concepts"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                        <GraduationCap className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">Core Concepts</div>
                        <p className="text-sm text-gray-400">Learn the fundamentals</p>
                      </div>
                    </a>
                    <a
                      href="#app"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                        <FileText className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">App</div>
                        <p className="text-sm text-gray-400">Application structure</p>
                      </div>
                    </a>
                    <a
                      href="#components"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                        <Code className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">Components</div>
                        <p className="text-sm text-gray-400">UI elements and layouts</p>
                      </div>
                    </a>
                    <a
                      href="#demos"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500/20">
                        <Rocket className="h-5 w-5 text-pink-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">Demos</div>
                        <p className="text-sm text-gray-400">Interactive examples</p>
                      </div>
                    </a>
                    <a
                      href="#faq"
                      onClick={closeMobileMenu}
                      className="flex items-start gap-3 rounded-xl p-3 text-white hover:bg-gray-700/80 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                        <BookOpen className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="">FAQ</div>
                        <p className="text-sm text-gray-400">Common questions</p>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              <a
                href="https://github.com/vogtb/glade"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl bg-gray-700/50 p-4 text-white hover:bg-gray-700/80 transition-colors"
              >
                <span className="">Github</span>
                <span className="text-[20px]">↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
