declare module 'react-scanlines' {
  import { ReactNode } from 'react';
  
  interface ScanlinesProps {
    opacity?: number;
    className?: string;
    children?: ReactNode;
  }
  
  export default function Scanlines(props: ScanlinesProps): JSX.Element;
} 