import { createTheme, alpha } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1",
      light: "#818cf8",
      dark: "#4f46e5",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ec4899",
      light: "#f472b6",
      dark: "#db2777",
    },
    success: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#16a34a",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    background: {
      default: "#0a0a1a",
      paper: alpha("#1a1a2e", 0.9),
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
    divider: alpha("#ffffff", 0.08),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.75rem",
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    h5: {
      fontSize: "1.125rem",
      fontWeight: 600,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.75,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.6,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },
  shape: {
    borderRadius: 14,
  },
  shadows: [
    "none",
    "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha("#6366f1", 0.4)} ${alpha("#ffffff", 0.05)}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backdropFilter: "blur(24px)",
          border: `1px solid ${alpha("#ffffff", 0.1)}`,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            boxShadow: `0 8px 32px ${alpha("#6366f1", 0.15)}`,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          padding: "10px 20px",
          transition: "all 0.2s ease",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: `0 4px 16px ${alpha("#6366f1", 0.4)}`,
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
        outlined: {
          borderWidth: 2,
          "&:hover": {
            borderWidth: 2,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backdropFilter: "blur(10px)",
            backgroundColor: alpha("#ffffff", 0.05),
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: alpha("#ffffff", 0.08),
            },
            "&.Mui-focused": {
              backgroundColor: alpha("#ffffff", 0.08),
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 6,
          "& .MuiSlider-track": {
            background: "linear-gradient(90deg, #6366f1, #ec4899)",
            border: "none",
          },
          "& .MuiSlider-rail": {
            backgroundColor: alpha("#6366f1", 0.2),
          },
        },
        thumb: {
          width: 18,
          height: 18,
          backgroundColor: "#fff",
          boxShadow: `0 2px 8px ${alpha("#000", 0.3)}`,
          "&:hover, &.Mui-focusVisible": {
            boxShadow: `0 0 0 8px ${alpha("#6366f1", 0.2)}`,
          },
        },
        mark: {
          backgroundColor: alpha("#fff", 0.3),
          width: 4,
          height: 4,
          borderRadius: 2,
        },
        markLabel: {
          fontSize: "0.7rem",
          color: alpha("#fff", 0.5),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        standardSuccess: {
          backgroundColor: alpha("#22c55e", 0.15),
          color: "#4ade80",
        },
        standardError: {
          backgroundColor: alpha("#ef4444", 0.15),
          color: "#f87171",
        },
        standardWarning: {
          backgroundColor: alpha("#f59e0b", 0.15),
          color: "#fbbf24",
        },
        standardInfo: {
          backgroundColor: alpha("#6366f1", 0.15),
          color: "#818cf8",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          "&:before": {
            display: "none",
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: alpha("#6366f1", 0.2),
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(4px)",
        },
      },
    },
  },
});
