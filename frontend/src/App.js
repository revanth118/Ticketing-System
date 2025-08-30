import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { AlertCircle, Plus, LogOut, Ticket, Clock, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, Edit } from 'lucide-react';

// Add favicon
const existingFavicon = document.querySelector('link[rel="icon"]');
if (existingFavicon) {
  existingFavicon.href = '/favicon.ico';
} else {
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/x-icon';
  favicon.href = '/favicon.ico';
  document.head.appendChild(favicon);
}

// Bootstrap CSS
const bootstrapLink = document.createElement('link');
bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
bootstrapLink.rel = 'stylesheet';
bootstrapLink.integrity = 'sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN';
bootstrapLink.crossOrigin = 'anonymous';
document.head.appendChild(bootstrapLink);

// Bootstrap JS
const bootstrapScript = document.createElement('script');
bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js';
bootstrapScript.integrity = 'sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL';
bootstrapScript.crossOrigin = 'anonymous';
document.head.appendChild(bootstrapScript);

// Context and State Management
const TicketContext = createContext();

const ticketReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TICKETS':
      return { ...state, tickets: action.payload };
    case 'ADD_TICKET':
      return { ...state, tickets: [action.payload, ...state.tickets] };
    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: state.tickets.map(ticket =>
          ticket.id === action.payload.id ? action.payload : ticket
        )
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SUCCESS':
      return { ...state, success: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, error: null, success: null };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload };
    case 'SET_FILTER':
      return { ...state, statusFilter: action.payload.status, priorityFilter: action.payload.priority };
    case 'SET_PAGINATION':
      return { ...state, currentPage: action.payload };
    default:
      return state;
  }
};

function TicketProvider({ children }) {
  const [state, dispatch] = useReducer(ticketReducer, {
    tickets: [],
    loading: false,
    error: null,
    success: null,
    searchTerm: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    currentPage: 1
  });

  const API_BASE = process.env.REACT_APP_API_URL || "https://ticketing-system-4r4u.onrender.com/api";

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  const handleApiError = (error, fallbackMessage = 'An unexpected error occurred') => {
    let errorMessage = fallbackMessage;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to server. Please check if the server is running.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    console.error('API Error:', error);
  };

  const createTicket = async (ticketData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_MESSAGES' });

      const response = await fetch(`${API_BASE}/createTicket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }
      
      dispatch({ type: 'ADD_TICKET', payload: responseData });
      dispatch({ type: 'SET_SUCCESS', payload: 'Ticket created successfully!' });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        dispatch({ type: 'CLEAR_MESSAGES' });
      }, 5000);
      
    } catch (error) {
      handleApiError(error, 'Failed to create ticket');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getAllTickets = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_MESSAGES' });
      
      const response = await fetch(`${API_BASE}/getAllTickets`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      // Handle both old format (array) and new format (object with tickets array)
      const tickets = Array.isArray(data) ? data : data.tickets || [];
      dispatch({ type: 'SET_TICKETS', payload: tickets });
      
    } catch (error) {
      handleApiError(error, 'Failed to fetch tickets');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateTicket = async (id, updates) => {
    try {
      dispatch({ type: 'CLEAR_MESSAGES' });
      
      const response = await fetch(`${API_BASE}/ticket/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }
      
      dispatch({ type: 'UPDATE_TICKET', payload: responseData });
      dispatch({ type: 'SET_SUCCESS', payload: 'Ticket updated successfully!' });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        dispatch({ type: 'CLEAR_MESSAGES' });
      }, 5000);
      
    } catch (error) {
      handleApiError(error, 'Failed to update ticket');
    }
  };

  const setSearch = (term) => {
    dispatch({ type: 'SET_SEARCH', payload: term });
    dispatch({ type: 'SET_PAGINATION', payload: 1 }); // Reset to first page
  };

  const setFilter = (status, priority) => {
    dispatch({ type: 'SET_FILTER', payload: { status, priority } });
    dispatch({ type: 'SET_PAGINATION', payload: 1 }); // Reset to first page
  };

  const setPage = (page) => {
    dispatch({ type: 'SET_PAGINATION', payload: page });
  };

  return React.createElement(TicketContext.Provider, {
    value: {
      ...state,
      createTicket,
      getAllTickets,
      updateTicket,
      setSearch,
      setFilter,
      setPage,
      clearMessages
    }
  }, children);
}

const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within TicketProvider');
  }
  return context;
};

// Form validation utilities
const validateField = (value, fieldName, type = 'text', options = {}) => {
  const errors = [];
  const { required = true, minLength = 0, maxLength = Infinity, pattern } = options;

  if (required && (!value || value.trim() === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (value && value.trim().length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }

  if (value && value.trim().length > maxLength) {
    errors.push(`${fieldName} must not exceed ${maxLength} characters`);
  }

  if (pattern && value && !pattern.test(value.trim())) {
    errors.push(`${fieldName} format is invalid`);
  }

  return errors;
};

const validateTicketForm = (formData) => {
  const errors = {};
  
  // Title validation
  const titleErrors = validateField(formData.title, 'Title', 'text', {
    required: true,
    minLength: 3,
    maxLength: 200
  });
  if (titleErrors.length > 0) errors.title = titleErrors;

  // Description validation
  const descriptionErrors = validateField(formData.description, 'Description', 'text', {
    required: true,
    minLength: 10,
    maxLength: 2000
  });
  if (descriptionErrors.length > 0) errors.description = descriptionErrors;

  // Priority validation
  if (!['low', 'medium', 'high'].includes(formData.priority)) {
    errors.priority = ['Please select a valid priority'];
  }

  // Status validation (for edit form)
  if (formData.status && !['open', 'inprogress', 'closed'].includes(formData.status)) {
    errors.status = ['Please select a valid status'];
  }

  return errors;
};

const validateLoginForm = (formData) => {
  const errors = {};
  
  const usernameErrors = validateField(formData.username, 'Username', 'text', {
    required: true,
    minLength: 3,
    maxLength: 50
  });
  if (usernameErrors.length > 0) errors.username = usernameErrors;

  const passwordErrors = validateField(formData.password, 'Password', 'text', {
    required: true,
    minLength: 6,
    maxLength: 100
  });
  if (passwordErrors.length > 0) errors.password = passwordErrors;

  return errors;
};

// Alert Component
function AlertMessage({ type, message, onClose }) {
  const getAlertClass = (type) => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-danger';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return React.createElement(CheckCircle, { size: 16, className: 'me-2' });
      case 'error': return React.createElement(XCircle, { size: 16, className: 'me-2' });
      case 'warning': return React.createElement(AlertCircle, { size: 16, className: 'me-2' });
      default: return React.createElement(AlertCircle, { size: 16, className: 'me-2' });
    }
  };

  return React.createElement('div', { 
    className: `alert ${getAlertClass(type)} alert-dismissible fade show`, 
    role: 'alert' 
  },
    React.createElement('div', { className: 'd-flex align-items-center' },
      getIcon(type),
      React.createElement('div', null, message)
    ),
    onClose && React.createElement('button', {
      type: 'button',
      className: 'btn-close',
      onClick: onClose,
      'aria-label': 'Close'
    })
  );
}

// Field Error Component
function FieldError({ errors }) {
  if (!errors || errors.length === 0) return null;
  
  return React.createElement('div', { className: 'invalid-feedback d-block' },
    errors.map((error, index) => 
      React.createElement('div', { key: index }, error)
    )
  );
}

const SessionHelper = {
  setUser: (username) => {
    sessionStorage.setItem('ticketing_user', username);
  },
  getUser: () => {
    return sessionStorage.getItem('ticketing_user');
  },
  clearUser: () => {
    sessionStorage.removeItem('ticketing_user');
  }
};

// Login Component
function LoginForm({ onLogin }) {
  const [formData, setFormData] = useState({
    username: 'admin',
    password: 'password'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Clear login error
    if (loginError) {
      setLoginError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');

    // Validate form
    const validationErrors = validateLoginForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    // Simulate login delay
    setTimeout(() => {
      if (formData.username.trim() === 'admin' && formData.password === 'password') {
        SessionHelper.setUser(formData.username);
        onLogin(formData.username);
        setErrors({});
      } else {
        setLoginError('Invalid username or password. Please check your credentials and try again.');
      }
      setIsSubmitting(false);
    }, 500);
  };

  return React.createElement('div', { className: 'min-vh-100 bg-light d-flex align-items-center justify-content-center' },
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'row justify-content-center' },
        React.createElement('div', { className: 'col-md-6 col-lg-4' },
          React.createElement('div', { className: 'card shadow' },
            React.createElement('div', { className: 'card-body p-4' },
              React.createElement('div', { className: 'text-center mb-4' },
                React.createElement('img', { 
                  src: '/logo.png', 
                  alt: 'Support Portal Logo',
                  className: 'mb-3',
                  style: { width: '150px', height: '48px' }
                }),
                React.createElement('h2', { className: 'card-title' }, 'Support Portal'),
                React.createElement('p', { className: 'text-muted' }, 'Sign in to your account')
              ),
              
              loginError && React.createElement(AlertMessage, {
                type: 'error',
                message: loginError,
                onClose: () => setLoginError('')
              }),
              
              React.createElement('form', { onSubmit: handleSubmit, noValidate: true },
                React.createElement('div', { className: 'mb-3' },
                  React.createElement('label', { htmlFor: 'username', className: 'form-label' }, 'Username'),
                  React.createElement('input', {
                    type: 'text',
                    className: `form-control ${errors.username ? 'is-invalid' : ''}`,
                    id: 'username',
                    value: formData.username,
                    onChange: (e) => handleInputChange('username', e.target.value),
                    placeholder: 'Enter username',
                    disabled: isSubmitting
                  }),
                  React.createElement(FieldError, { errors: errors.username })
                ),
                
                React.createElement('div', { className: 'mb-3' },
                  React.createElement('label', { htmlFor: 'password', className: 'form-label' }, 'Password'),
                  React.createElement('input', {
                    type: 'password',
                    className: `form-control ${errors.password ? 'is-invalid' : ''}`,
                    id: 'password',
                    value: formData.password,
                    onChange: (e) => handleInputChange('password', e.target.value),
                    placeholder: 'Enter password',
                    disabled: isSubmitting
                  }),
                  React.createElement(FieldError, { errors: errors.password })
                ),

                React.createElement('button', {
                  type: 'submit',
                  className: 'btn btn-primary w-100',
                  disabled: isSubmitting
                }, isSubmitting ? 
                  React.createElement(React.Fragment, null,
                    React.createElement('span', { 
                      className: 'spinner-border spinner-border-sm me-2', 
                      role: 'status', 
                      'aria-hidden': 'true' 
                    }),
                    'Signing In...'
                  ) : 'Sign In'
                )
              ),
              
              React.createElement('div', { className: 'mt-3' },
                React.createElement('small', { className: 'text-muted' },
                  'Demo credentials: admin / password'
                )
              )
            )
          )
        )
      )
    )
  );
}

// Create Ticket Modal
function CreateTicketModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [errors, setErrors] = useState({});
  const { createTicket, loading } = useTickets();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateTicketForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await createTicket(formData);
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        priority: 'medium'
      });
      setErrors({});
      onClose();
    } catch (error) {
      // Error is handled in the context
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return React.createElement('div', { 
    className: 'modal d-block', 
    tabIndex: '-1', 
    style: { backgroundColor: 'rgba(0,0,0,0.5)' } 
  },
    React.createElement('div', { className: 'modal-dialog modal-lg' },
      React.createElement('div', { className: 'modal-content' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h5', { className: 'modal-title' }, 'Create New Ticket'),
          React.createElement('button', {
            type: 'button',
            className: 'btn-close',
            onClick: handleClose,
            'aria-label': 'Close',
            disabled: loading
          })
        ),
        
        React.createElement('div', { className: 'modal-body' },
          React.createElement('form', { onSubmit: handleSubmit, noValidate: true },
            React.createElement('div', { className: 'mb-3' },
              React.createElement('label', { htmlFor: 'ticketTitle', className: 'form-label' }, 
                'Title ', React.createElement('span', { className: 'text-danger' }, '*')
              ),
              React.createElement('input', {
                type: 'text',
                className: `form-control ${errors.title ? 'is-invalid' : ''}`,
                id: 'ticketTitle',
                value: formData.title,
                onChange: (e) => handleInputChange('title', e.target.value),
                placeholder: 'Enter a descriptive title for your issue',
                disabled: loading,
                maxLength: 200
              }),
              React.createElement('div', { className: 'form-text' }, 
                `${formData.title.length}/200 characters`
              ),
              React.createElement(FieldError, { errors: errors.title })
            ),

            React.createElement('div', { className: 'mb-3' },
              React.createElement('label', { htmlFor: 'ticketDescription', className: 'form-label' }, 
                'Description ', React.createElement('span', { className: 'text-danger' }, '*')
              ),
              React.createElement('textarea', {
                className: `form-control ${errors.description ? 'is-invalid' : ''}`,
                id: 'ticketDescription',
                rows: '5',
                value: formData.description,
                onChange: (e) => handleInputChange('description', e.target.value),
                placeholder: 'Provide detailed information about your issue, including steps to reproduce, error messages, etc.',
                disabled: loading,
                maxLength: 2000
              }),
              React.createElement('div', { className: 'form-text' }, 
                `${formData.description.length}/2000 characters`
              ),
              React.createElement(FieldError, { errors: errors.description })
            ),

            React.createElement('div', { className: 'mb-3' },
              React.createElement('label', { htmlFor: 'ticketPriority', className: 'form-label' }, 'Priority'),
              React.createElement('select', {
                className: `form-select ${errors.priority ? 'is-invalid' : ''}`,
                id: 'ticketPriority',
                value: formData.priority,
                onChange: (e) => handleInputChange('priority', e.target.value),
                disabled: loading
              },
                React.createElement('option', { value: 'low' }, 'Low - General questions or minor issues'),
                React.createElement('option', { value: 'medium' }, 'Medium - Standard support request'),
                React.createElement('option', { value: 'high' }, 'High - Urgent issue affecting work')
              ),
              React.createElement(FieldError, { errors: errors.priority })
            )
          )
        ),

        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', {
            type: 'button',
            className: 'btn btn-secondary',
            onClick: handleClose,
            disabled: loading
          }, 'Cancel'),
          React.createElement('button', {
            type: 'button',
            className: 'btn btn-primary',
            onClick: handleSubmit,
            disabled: loading || !formData.title.trim() || !formData.description.trim()
          }, loading ? 
            React.createElement(React.Fragment, null,
              React.createElement('span', { 
                className: 'spinner-border spinner-border-sm me-2', 
                role: 'status', 
                'aria-hidden': 'true' 
              }),
              'Creating...'
            ) : 'Create Ticket'
          )
        )
      )
    )
  );
}

// Edit Ticket Modal
function EditTicketModal({ isOpen, onClose, ticket }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  const { updateTicket, loading } = useTickets();

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setPriority(ticket.priority || 'medium');
      setStatus(ticket.status || 'open');
    }
  }, [ticket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (ticket) {
      await updateTicket(ticket.id, { title, description, priority, status });
      onClose();
    }
  };

  const resetForm = () => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setPriority(ticket.priority || 'medium');
      setStatus(ticket.status || 'open');
    }
  };

  if (!isOpen || !ticket) return null;

  return React.createElement('div', { 
    className: 'modal d-block', 
    tabIndex: '-1', 
    style: { backgroundColor: 'rgba(0,0,0,0.5)' } 
  },
    React.createElement('div', { className: 'modal-dialog' },
      React.createElement('div', { className: 'modal-content' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h5', { className: 'modal-title' }, `Edit Ticket #${ticket.id}`),
          React.createElement('button', {
            type: 'button',
            className: 'btn-close',
            onClick: onClose,
            'aria-label': 'Close'
          })
        ),
        
        React.createElement('div', { className: 'modal-body' },
          React.createElement('form', { onSubmit: handleSubmit },
            React.createElement('div', { className: 'mb-3' },
              React.createElement('label', { htmlFor: 'editTicketTitle', className: 'form-label' }, 'Title'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                id: 'editTicketTitle',
                value: title,
                onChange: (e) => setTitle(e.target.value),
                required: true
              })
            ),

            React.createElement('div', { className: 'mb-3' },
              React.createElement('label', { htmlFor: 'editTicketDescription', className: 'form-label' }, 'Description'),
              React.createElement('textarea', {
                className: 'form-control',
                id: 'editTicketDescription',
                rows: '4',
                value: description,
                onChange: (e) => setDescription(e.target.value),
                required: true
              })
            ),

            React.createElement('div', { className: 'row' },
              React.createElement('div', { className: 'col-md-6' },
                React.createElement('div', { className: 'mb-3' },
                  React.createElement('label', { htmlFor: 'editTicketPriority', className: 'form-label' }, 'Priority'),
                  React.createElement('select', {
                    className: 'form-select',
                    id: 'editTicketPriority',
                    value: priority,
                    onChange: (e) => setPriority(e.target.value)
                  },
                    React.createElement('option', { value: 'low' }, 'Low'),
                    React.createElement('option', { value: 'medium' }, 'Medium'),
                    React.createElement('option', { value: 'high' }, 'High')
                  )
                )
              ),
              React.createElement('div', { className: 'col-md-6' },
                React.createElement('div', { className: 'mb-3' },
                  React.createElement('label', { htmlFor: 'editTicketStatus', className: 'form-label' }, 'Status'),
                  React.createElement('select', {
                    className: 'form-select',
                    id: 'editTicketStatus',
                    value: status,
                    onChange: (e) => setStatus(e.target.value)
                  },
                    React.createElement('option', { value: 'open' }, 'Open'),
                    React.createElement('option', { value: 'inprogress' }, 'In Progress'),
                    React.createElement('option', { value: 'closed' }, 'Closed')
                  )
                )
              )
            ),

            React.createElement('div', { className: 'alert alert-info' },
              React.createElement('small', null,
                React.createElement('strong', null, 'Created: '),
                new Date(ticket.created_at).toLocaleString()
              )
            )
          )
        ),

        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', {
            type: 'button',
            className: 'btn btn-outline-secondary',
            onClick: resetForm
          }, 'Reset'),
          React.createElement('button', {
            type: 'button',
            className: 'btn btn-secondary',
            onClick: onClose
          }, 'Cancel'),
          React.createElement('button', {
            type: 'button',
            className: 'btn btn-primary',
            onClick: handleSubmit,
            disabled: loading
          }, loading ? 
            React.createElement(React.Fragment, null,
              React.createElement('span', { 
                className: 'spinner-border spinner-border-sm me-2', 
                role: 'status', 
                'aria-hidden': 'true' 
              }),
              'Updating...'
            ) : 'Update'
          )
        )
      )
    )
  );
}

// Search and Filter Component
function SearchAndFilter() {
  const { searchTerm, statusFilter, priorityFilter, setSearch, setFilter } = useTickets();

  const handleStatusChange = (status) => {
    setFilter(status, priorityFilter);
  };

  const handlePriorityChange = (priority) => {
    setFilter(statusFilter, priority);
  };

  return React.createElement('div', { className: 'row g-3 mb-4' },
    React.createElement('div', { className: 'col-md-4' },
      React.createElement('div', { className: 'input-group' },
        React.createElement('span', { className: 'input-group-text' },
          React.createElement(Search, { size: 16 })
        ),
        React.createElement('input', {
          type: 'text',
          className: 'form-control',
          placeholder: 'Search tickets...',
          value: searchTerm,
          onChange: (e) => setSearch(e.target.value)
        })
      )
    ),
    
    React.createElement('div', { className: 'col-md-3' },
      React.createElement('select', {
        className: 'form-select',
        value: statusFilter,
        onChange: (e) => handleStatusChange(e.target.value)
      },
        React.createElement('option', { value: 'all' }, 'All Status'),
        React.createElement('option', { value: 'open' }, 'Open'),
        React.createElement('option', { value: 'inprogress' }, 'In Progress'),
        React.createElement('option', { value: 'closed' }, 'Closed')
      )
    ),
    
    React.createElement('div', { className: 'col-md-3' },
      React.createElement('select', {
        className: 'form-select',
        value: priorityFilter,
        onChange: (e) => handlePriorityChange(e.target.value)
      },
        React.createElement('option', { value: 'all' }, 'All Priority'),
        React.createElement('option', { value: 'high' }, 'High'),
        React.createElement('option', { value: 'medium' }, 'Medium'),
        React.createElement('option', { value: 'low' }, 'Low')
      )
    ),
    
    React.createElement('div', { className: 'col-md-2' },
      React.createElement('button', {
        className: 'btn btn-outline-secondary w-100',
        onClick: () => {
          setSearch('');
          setFilter('all', 'all');
        }
      }, 'Clear')
    )
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return React.createElement('nav', { 'aria-label': 'Tickets pagination' },
    React.createElement('ul', { className: 'pagination justify-content-center' },
      React.createElement('li', { className: `page-item ${currentPage === 1 ? 'disabled' : ''}` },
        React.createElement('button', {
          className: 'page-link',
          onClick: () => onPageChange(currentPage - 1),
          disabled: currentPage === 1
        },
          React.createElement(ChevronLeft, { size: 16 })
        )
      ),
      
      ...getVisiblePages().map((page, index) =>
        React.createElement('li', {
          key: index,
          className: `page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`
        },
          page === '...' ? 
            React.createElement('span', { className: 'page-link' }, '...') :
            React.createElement('button', {
              className: 'page-link',
              onClick: () => onPageChange(page)
            }, page)
        )
      ),
      
      React.createElement('li', { className: `page-item ${currentPage === totalPages ? 'disabled' : ''}` },
        React.createElement('button', {
          className: 'page-link',
          onClick: () => onPageChange(currentPage + 1),
          disabled: currentPage === totalPages
        },
          React.createElement(ChevronRight, { size: 16 })
        )
      )
    )
  );
}

// Responsive Tickets Display Component
function TicketsTable({ onEditTicket }) {
  const {
    tickets,
    updateTicket,
    searchTerm,
    statusFilter,
    priorityFilter,
    currentPage,
    setPage
  } = useTickets();

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and search tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return React.createElement(XCircle, { className: 'text-danger me-1', size: 16 });
      case 'inprogress': return React.createElement(Clock, { className: 'text-warning me-1', size: 16 });
      case 'closed': return React.createElement(CheckCircle, { className: 'text-success me-1', size: 16 });
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Open';
      case 'inprogress': return 'In Progress';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Mobile Card Component
  const MobileTicketCard = ({ ticket, index }) => 
    React.createElement('div', { className: 'card mb-3 border-start border-3', style: { borderColor: ticket.priority === 'high' ? '#dc3545' : ticket.priority === 'medium' ? '#ffc107' : '#198754' } },
      React.createElement('div', { className: 'card-body p-3' },
        React.createElement('div', { className: 'd-flex justify-content-between align-items-start mb-2' },
          React.createElement('div', null,
            React.createElement('h6', { className: 'card-title mb-1 fw-semibold' }, ticket.title),
            React.createElement('small', { className: 'text-muted' }, `#${startIndex + index + 1} • ID: ${ticket.id}`)
          ),
          React.createElement('div', { className: 'd-flex gap-1' },
            React.createElement('span', { className: `badge ${getPriorityBadge(ticket.priority)} badge-sm` },
              ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
            )
          )
        ),
        
        React.createElement('p', { className: 'card-text text-muted mb-2', style: { fontSize: '0.875rem' } },
          truncateText(ticket.description, 120)
        ),
        
        React.createElement('div', { className: 'row align-items-center' },
          React.createElement('div', { className: 'col-6' },
            React.createElement('div', { className: 'd-flex align-items-center mb-1' },
              getStatusIcon(ticket.status),
              React.createElement('small', { className: 'ms-1' }, getStatusText(ticket.status))
            ),
            React.createElement('small', { className: 'text-muted' },
              new Date(ticket.created_at).toLocaleDateString()
            )
          ),
          React.createElement('div', { className: 'col-6 text-end' },
            React.createElement('button', {
              className: 'btn btn-outline-primary btn-sm',
              onClick: () => onEditTicket(ticket)
            },
              React.createElement(Edit, { size: 14, className: 'me-1' }),
              'Edit'
            )
          )
        )
      )
    );

  // Empty state component
  const EmptyState = () =>
    React.createElement('div', { className: 'text-center py-5' },
      React.createElement(Ticket, { className: 'text-muted mb-3', size: 64 }),
      React.createElement('h6', { className: 'text-muted' }, 'No tickets found'),
      React.createElement('p', { className: 'text-muted mb-0' }, 'Try adjusting your search or filter criteria')
    );

  return React.createElement('div', null,
    // Header with pagination controls
    React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-3 flex-wrap gap-2' },
      React.createElement('div', null,
        React.createElement('span', { className: 'text-muted' },
          `Showing ${filteredTickets.length === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredTickets.length)} of ${filteredTickets.length} tickets`
        )
      ),
      React.createElement('div', { className: 'd-flex gap-2' },
        React.createElement('select', {
          className: 'form-select form-select-sm',
          style: { width: 'auto' },
          value: itemsPerPage,
          onChange: (e) => {
            setItemsPerPage(Number(e.target.value));
            setPage(1);
          }
        },
          React.createElement('option', { value: 10 }, '10 per page'),
          React.createElement('option', { value: 25 }, '25 per page'),
          React.createElement('option', { value: 50 }, '50 per page'),
          React.createElement('option', { value: 100 }, '100 per page')
        )
      )
    ),

    // Desktop Table View (hidden on mobile)
    React.createElement('div', { className: 'd-none d-lg-block' },
      React.createElement('div', { className: 'table-responsive' },
        React.createElement('table', { className: 'table table-hover' },
          React.createElement('thead', { className: 'table-light' },
            React.createElement('tr', null,
              React.createElement('th', { scope: 'col', width: '5%' }, '#'),
              React.createElement('th', { scope: 'col', width: '20%' }, 'Title'),
              React.createElement('th', { scope: 'col', width: '30%' }, 'Description'),
              React.createElement('th', { scope: 'col', width: '10%' }, 'Priority'),
              React.createElement('th', { scope: 'col', width: '12%' }, 'Status'),
              React.createElement('th', { scope: 'col', width: '13%' }, 'Created'),
              React.createElement('th', { scope: 'col', width: '10%' }, 'Actions')
            )
          ),
          React.createElement('tbody', null,
            paginatedTickets.length === 0 ? 
              React.createElement('tr', null,
                React.createElement('td', { colSpan: '7', className: 'text-center py-4' },
                  React.createElement(EmptyState)
                )
              ) :
              paginatedTickets.map((ticket, index) =>
                React.createElement('tr', { key: ticket.id },
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('small', { className: 'text-muted' }, startIndex + index + 1)
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('div', { className: 'fw-semibold' }, ticket.title),
                    React.createElement('small', { className: 'text-muted' }, `ID: ${ticket.id}`)
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('div', { title: ticket.description },
                      truncateText(ticket.description)
                    )
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('span', { className: `badge ${getPriorityBadge(ticket.priority)}` },
                      ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
                    )
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('div', { className: 'd-flex align-items-center' },
                      getStatusIcon(ticket.status),
                      React.createElement('span', { className: 'ms-1' }, getStatusText(ticket.status))
                    )
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('div', { style: { fontSize: '0.875rem' } },
                      new Date(ticket.created_at).toLocaleDateString()
                    ),
                    React.createElement('small', { className: 'text-muted' },
                      new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    )
                  ),
                  React.createElement('td', { className: 'align-middle' },
                    React.createElement('button', {
                      className: 'btn btn-outline-primary btn-sm d-flex align-items-center',
                      onClick: () => onEditTicket(ticket),
                      title: 'Edit ticket'
                    },
                      React.createElement(Edit, { size: 14, className: 'me-1' }),
                      'Edit'
                    )
                  )
                )
              )
          )
        )
      )
    ),

    // Mobile Card View (visible only on mobile)
    React.createElement('div', { className: 'd-lg-none' },
      paginatedTickets.length === 0 ?
        React.createElement(EmptyState) :
        paginatedTickets.map((ticket, index) =>
          React.createElement(MobileTicketCard, { 
            key: ticket.id, 
            ticket, 
            index 
          })
        )
    ),

    // Pagination
    React.createElement(Pagination, {
      currentPage,
      totalPages,
      onPageChange: setPage
    })
  );
}

// Main Dashboard
function Dashboard({ user, onLogout }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const { loading, error, success, getAllTickets, clearMessages } = useTickets();

  useEffect(() => {
    getAllTickets();
  }, []);

  const handleEditTicket = (ticket) => {
    clearMessages(); // Clear any existing messages
    setEditingTicket(ticket);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTicket(null);
  };

  const handleCreateTicket = () => {
    clearMessages(); // Clear any existing messages
    setShowCreateModal(true);
  };

  return React.createElement('div', { className: 'min-vh-100 bg-light' },
    // Header
    React.createElement('nav', { className: 'navbar navbar-expand-lg navbar-light bg-white shadow-sm' },
      React.createElement('div', { className: 'container-fluid' },
        React.createElement('div', { className: 'navbar-brand d-flex align-items-center' },
          React.createElement('img', { 
            src: '/logo.png', 
            alt: 'Support Portal Logo',
            className: 'me-2',
            style: { width: '150px', height: '48px' }
          }),
          React.createElement('span', { className: 'fw-bold' }, 'Support Portal')
        ),
        
        React.createElement('div', { className: 'd-flex align-items-center' },
          React.createElement('span', { className: 'me-3' }, `Welcome, ${user}`),
          React.createElement('button', {
            className: 'btn btn-outline-secondary btn-sm d-flex align-items-center',
            onClick: onLogout
          },
            React.createElement(LogOut, { size: 16, className: 'me-1' }),
            'Logout'
          )
        )
      )
    ),

    // Main Content
    React.createElement('div', { className: 'container-fluid py-4' },
      React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-4' },
        React.createElement('h5', { className: 'fw-bold mb-0' }, 'Tickets'),
        React.createElement('button', {
          className: 'btn btn-primary d-flex align-items-center',
          onClick: handleCreateTicket
        },
          React.createElement(Plus, { size: 16, className: 'me-2' }),
          'New Ticket'
        )
      ),

      // Alert Messages
      React.createElement('div', { className: 'mb-3' },
        error && React.createElement(AlertMessage, {
          type: 'error',
          message: error,
          onClose: clearMessages
        }),
        
        success && React.createElement(AlertMessage, {
          type: 'success',
          message: success,
          onClose: clearMessages
        })
      ),

      // Search and Filter
      React.createElement(SearchAndFilter),

      loading ? 
        React.createElement('div', { className: 'text-center py-5' },
          React.createElement('div', { className: 'spinner-border text-primary', role: 'status' },
            React.createElement('span', { className: 'visually-hidden' }, 'Loading...')
          ),
          React.createElement('p', { className: 'mt-2 text-muted' }, 'Loading tickets...')
        ) :
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-body p-0' },
            React.createElement(TicketsTable, { onEditTicket: handleEditTicket })
          )
        )
    ),

    React.createElement(CreateTicketModal, {
      isOpen: showCreateModal,
      onClose: () => setShowCreateModal(false)
    }),

    React.createElement(EditTicketModal, {
      isOpen: showEditModal,
      onClose: handleCloseEditModal,
      ticket: editingTicket
    })
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    const savedUser = SessionHelper.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const handleLogin = (username) => {
    setUser(username);
  };

  const handleLogout = () => {
    SessionHelper.clearUser();
    setUser(null);
  };

  return React.createElement(TicketProvider, null,
    user ? 
      React.createElement(Dashboard, { user, onLogout: handleLogout }) :
      React.createElement(LoginForm, { onLogin: handleLogin })
  );
}

export default App;