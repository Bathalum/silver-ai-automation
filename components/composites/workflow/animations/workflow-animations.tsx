'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Fade transition animations
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
}

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const fadeInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const fadeInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeOut" }
}

// Scale animations
export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" }
}

export const scaleOnHover = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  transition: { duration: 0.2 }
}

// Slide animations
export const slideInFromBottom = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const slideInFromTop = {
  initial: { y: "-100%" },
  animate: { y: 0 },
  exit: { y: "-100%" },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const slideInFromLeft = {
  initial: { x: "-100%" },
  animate: { x: 0 },
  exit: { x: "-100%" },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const slideInFromRight = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { duration: 0.3, ease: "easeOut" }
}

// Stagger animations for lists
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
}

// Node-specific animations
export const nodeSelectAnimation = {
  initial: { scale: 1 },
  animate: { scale: 1.02 },
  transition: { duration: 0.2, ease: "easeOut" }
}

export const nodeExecutionPulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export const connectionAnimation = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 0.8, ease: "easeInOut" }
}

// Loading animations
export const loadingSpinner = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

export const loadingDots = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export const progressBarAnimation = {
  initial: { scaleX: 0 },
  animate: { scaleX: 1 },
  transition: { duration: 0.5, ease: "easeOut" }
}

// Hover and interaction animations
export const buttonHover = {
  hover: { 
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
}

export const cardHover = {
  hover: { 
    y: -4,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: { duration: 0.3 }
  }
}

// Component wrappers for common animations
interface AnimatedContainerProps {
  children: React.ReactNode
  animation?: typeof fadeIn | typeof fadeInUp | typeof scaleIn
  className?: string
  delay?: number
}

export function AnimatedContainer({ 
  children, 
  animation = fadeIn, 
  className,
  delay = 0 
}: AnimatedContainerProps) {
  return (
    <motion.div
      {...animation}
      transition={{ ...animation.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListProps {
  children: React.ReactNode[]
  className?: string
  itemClassName?: string
}

export function AnimatedList({ children, className, itemClassName }: AnimatedListProps) {
  return (
    <motion.div {...staggerContainer} className={className}>
      {children.map((child, index) => (
        <motion.div key={index} {...staggerItem} className={itemClassName}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

interface AnimatedModalProps {
  children: React.ReactNode
  isOpen: boolean
  className?: string
}

export function AnimatedModal({ children, isOpen, className }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...fadeIn}
          className={cn("fixed inset-0 z-50 bg-black/50", className)}
        >
          <motion.div
            {...scaleIn}
            className="fixed inset-0 flex items-center justify-center p-4"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AnimatedNodeProps {
  children: React.ReactNode
  isSelected?: boolean
  isExecuting?: boolean
  className?: string
}

export function AnimatedNode({ 
  children, 
  isSelected, 
  isExecuting, 
  className 
}: AnimatedNodeProps) {
  return (
    <motion.div
      {...fadeIn}
      {...(isSelected ? nodeSelectAnimation : {})}
      {...(isExecuting ? nodeExecutionPulse : {})}
      whileHover={scaleOnHover.hover}
      whileTap={scaleOnHover.tap}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function AnimatedButton({ children, className, onClick }: AnimatedButtonProps) {
  return (
    <motion.button
      {...buttonHover}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function AnimatedCard({ children, className, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      {...fadeInUp}
      {...cardHover}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Notification animations
export const notificationSlideIn = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
}

export const notificationFadeIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.2, ease: "easeOut" }
}