/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Fixed.cpp                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/06 14:00:04 by ldesboui          #+#    #+#             */
/*   Updated: 2026/03/10 18:48:42 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
#include "Fixed.hpp"
#include <cmath>
#include <ostream>

const int Fixed::_frac = 8;
Fixed::Fixed( void ) : _value(0)
{
}

Fixed::Fixed(const int nb)
{
	this->setRawBits( nb << _frac );
}

Fixed::Fixed(const float nb)
{
	this->setRawBits(roundf(nb * (1 << _frac)));
}

Fixed::Fixed( const Fixed& aFixed)
{
	this->_value = aFixed.getRawBits();
}

Fixed::~Fixed( void )
{
}
/*
 *
 * OPERATORS FUNCTIONS
 *
*/

Fixed &Fixed::operator=(const Fixed& aFixed)
{
	this->_value = aFixed.getRawBits();
	return (*this);
}

Fixed Fixed::operator+(const Fixed& aFixed) const
{
	return (Fixed(toFloat() + aFixed.toFloat()));
}

Fixed Fixed::operator-(const Fixed& aFixed) const
{
	return (Fixed(toFloat() - aFixed.toFloat()));
}

Fixed Fixed::operator/(const Fixed& aFixed) const
{
	return (Fixed(toFloat() / aFixed.toFloat()));
}

Fixed Fixed::operator*(const Fixed& aFixed) const
{
	return (Fixed(toFloat() * aFixed.toFloat()));
}

Fixed &Fixed::operator++( void )
{
	this->_value  = this->_value + 1;
	return (*this);
}

Fixed &Fixed::operator--( void )
{
	this->_value  = this->_value - 1;
	return (*this);
}

Fixed Fixed::operator++( int )
{
	Fixed pre(*this);
	++(*this);
	return (pre);
}

Fixed Fixed::operator--( int )
{
	--(*this);
	return (*this);
}

bool Fixed::operator>(const Fixed& aFixed) const
{
	return (this->getRawBits() > aFixed.getRawBits());
}

bool Fixed::operator<(const Fixed& aFixed) const
{
	return (this->getRawBits() < aFixed.getRawBits());
}


bool Fixed::operator>=(const Fixed& aFixed)  const
{
	return (this->getRawBits() >= aFixed.getRawBits());
}

bool Fixed::operator<=(const Fixed& aFixed) const
{
	return (this->getRawBits() <= aFixed.getRawBits());
}

bool Fixed::operator!=(const Fixed& aFixed) const
{
	return (this->getRawBits() != aFixed.getRawBits());
}

bool Fixed::operator==(const Fixed& aFixed) const
{
	return (this->getRawBits() == aFixed.getRawBits());
}

std::ostream &operator<<(std::ostream &os, Fixed const &aFixed)
{
	os << aFixed.toFloat();
	return os;
}
/*
 *  Static functions
 */

Fixed &Fixed::min(Fixed &firstFixed, Fixed &secondFixed)
{
	if (firstFixed < secondFixed)
		return (firstFixed);
	else
		return (secondFixed);
}

const Fixed &Fixed::min(const Fixed &firstFixed, const Fixed &secondFixed)
{
	Fixed tmp1(firstFixed);
	Fixed tmp2(secondFixed);
	if (tmp1 < tmp2)
		return (firstFixed);
	else
		return (secondFixed);
}

Fixed &Fixed::max(Fixed &firstFixed, Fixed &secondFixed)
{
	if (firstFixed > secondFixed)
		return (firstFixed);
	else
		return (secondFixed);
}

const Fixed &Fixed::max(const Fixed &firstFixed, const Fixed &secondFixed)
{
	Fixed tmp1(firstFixed);
	Fixed tmp2(secondFixed);
	if (tmp1 > tmp2)
		return (firstFixed);
	else
		return (secondFixed);
}

int	Fixed::getRawBits( void ) const
{
	return (this->_value);
}

void	Fixed::setRawBits( int const raw )
{
	this->_value = raw;
}

float Fixed::toFloat( void ) const
{
	float nb;

	nb = ((float)this->getRawBits() / (float)(1 << _frac));
	return (nb);
}

int Fixed::toInt( void ) const
{
	int nb;

	nb = (this->getRawBits() >> _frac);
	return (nb);
}
