export const theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    card: 16,     // standard card border-radius: 16px
    input: 8,     // standard input border-radius: 8px
    button: 8,    // standard button border-radius: 8px
    sm: 4,
    round: 9999,
  },
  typography: {
    fontSize: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 26,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
    },
  },
};

export type AppTheme = typeof theme;
