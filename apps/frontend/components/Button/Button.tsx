import classNames from "classnames";
import styles from "./Button.module.scss";

interface IButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "transparent" | "unstyled";
  onClick?: (e: any) => void;
}

export const Button = ({
  children,
  className,
  onClick,
  variant = "primary",
  ...rest
}: IButtonProps) => {
  return (
    <button
      className={classNames(styles.button, styles[variant], className)}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};
