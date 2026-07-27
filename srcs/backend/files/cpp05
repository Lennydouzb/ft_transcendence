/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PresidentialPardonForm.cpp                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ldesboui <ldesboui@42angouleme.fr>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/25 12:52:30 by ldesboui          #+#    #+#             */
/*   Updated: 2026/04/25 18:23:54 by ldesboui         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "PresidentialPardonForm.hpp"

PresidentialPardonForm& PresidentialPardonForm::operator=(const PresidentialPardonForm& other)
{
	(void)other;
	return (*this);
}

PresidentialPardonForm::PresidentialPardonForm() : AForm("Presidential Form", 25, 5), target("Something")
{
}

PresidentialPardonForm::PresidentialPardonForm(const std::string target) : AForm("Presidential Form", 25, 5), target(target)
{
}

PresidentialPardonForm::PresidentialPardonForm(const PresidentialPardonForm& other) : AForm(other.getName(), other.getSignGrade(), other.getExecGrade()), target(other.target)
{
}

PresidentialPardonForm::~PresidentialPardonForm()
{
}

const std::string PresidentialPardonForm::getTarget() const
{
	return (this->target);
}

void PresidentialPardonForm::printAction() const
{
	std::cout << this->target << " has been pardoned by Zaphod Beeblebrox" << std::endl; 
}
