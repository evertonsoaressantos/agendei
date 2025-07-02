export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class CustomerValidator {
  static validateCustomerForm(data: any): ValidationResult {
    const errors: Record<string, string> = {};

    // Required fields
    if (!data.first_name?.trim()) {
      errors.first_name = 'Primeiro nome é obrigatório';
    } else if (data.first_name.length > 50) {
      errors.first_name = 'Primeiro nome deve ter 50 caracteres ou menos';
    }

    if (!data.last_name?.trim()) {
      errors.last_name = 'Sobrenome é obrigatório';
    } else if (data.last_name.length > 50) {
      errors.last_name = 'Sobrenome deve ter 50 caracteres ou menos';
    }

    if (!data.email?.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!this.isValidEmail(data.email)) {
      errors.email = 'Por favor, digite um endereço de email válido';
    } else if (data.email.length > 100) {
      errors.email = 'Email deve ter 100 caracteres ou menos';
    }

    // Optional fields validation
    if (data.phone_number && !this.isValidPhoneNumber(data.phone_number)) {
      errors.phone_number = 'Por favor, digite um número de telefone válido (+XX-XXX-XXX-XXXX)';
    }

    if (data.address && data.address.length > 200) {
      errors.address = 'Endereço deve ter 200 caracteres ou menos';
    }

    if (data.city && data.city.length > 100) {
      errors.city = 'Cidade deve ter 100 caracteres ou menos';
    }

    if (data.state_province && data.state_province.length > 100) {
      errors.state_province = 'Estado/Província deve ter 100 caracteres ou menos';
    }

    if (data.postal_code && !this.isValidPostalCode(data.postal_code, data.country)) {
      errors.postal_code = 'Por favor, digite um CEP válido para o país selecionado';
    }

    if (data.country && data.country.length > 100) {
      errors.country = 'País deve ter 100 caracteres ou menos';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhoneNumber(phone: string): boolean {
    // Format: +XX-XXX-XXX-XXXX (flexible with spaces and dashes)
    const phoneRegex = /^\+\d{1,3}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private static isValidPostalCode(postalCode: string, country?: string): boolean {
    if (!postalCode) return true; // Optional field

    // Basic validation - in a real app, you'd have country-specific rules
    const patterns: Record<string, RegExp> = {
      'Brasil': /^\d{5}-?\d{3}$/,
      'Estados Unidos': /^\d{5}(-\d{4})?$/,
      'Canadá': /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/,
      'Reino Unido': /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
      'França': /^\d{5}$/,
      'Alemanha': /^\d{5}$/,
      'Espanha': /^\d{5}$/,
      'Itália': /^\d{5}$/
    };

    if (country && patterns[country]) {
      return patterns[country].test(postalCode);
    }

    // Generic validation for other countries
    return /^[A-Za-z0-9\s-]{3,10}$/.test(postalCode);
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  static formatPostalCode(postalCode: string, country?: string): string {
    if (!postalCode) return '';

    // Country-specific formatting
    if (country === 'Brasil') {
      const cleaned = postalCode.replace(/\D/g, '');
      if (cleaned.length === 8) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
      }
    }

    return postalCode.toUpperCase();
  }
}