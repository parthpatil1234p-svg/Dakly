/** Opaque panel shared by the existing workflow screens. */
export default function SpotlightCard({ children, className = '', as: Tag = 'div', ...props }) {
  return <Tag className={`legacy-panel ${className}`} {...props}>{children}</Tag>;
}

